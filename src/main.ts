import os from 'os'
import path from 'path'
import {promises} from 'fs'
import {parseLcovFile} from './coverage'
import {parseMachineFile} from './parser'
import {runFlutterTest} from './runner'
import {createPathContext} from './paths'
import {ChangedLinesCoverage, computeChangedLinesCoverage} from './diff'
import {Report, buildReport} from './report/build'
import {
  failureDetails,
  renderCheckSummary,
  renderCheckText,
  renderComment,
  renderStepSummary
} from './report/markdown'
import {buildAnnotations} from './report/annotations'
import {cleanErrorMessage, formatDuration} from './report/format'
import {
  Octokit,
  RunContext,
  createCheckRun,
  fetchChangedFiles,
  readContext,
  upsertComment
} from './github'
import {CoverageData} from './model/coverage'
import {TestRun} from './model/test-run'

type Core = typeof import('@actions/core', {
  with: {'resolution-mode': 'import'}
})

interface Inputs {
  workingDirectory: string
  testArgs: string
  flutterCommand: string
  coverage: boolean
  coverageThreshold?: number
  changedLinesCoverageThreshold?: number
  annotateUncoveredLines: boolean
  machinePath: string
  coveragePath: string
  failOnError: boolean
  title: string
  token: string
}

function parseThreshold(name: string, value: string): number | undefined {
  if (value.trim() === '') return undefined
  const threshold = Number(value)
  if (Number.isNaN(threshold) || threshold < 0 || threshold > 100) {
    throw new Error(`${name} must be a number between 0 and 100.`)
  }
  return threshold
}

function parseBoolean(name: string, value: string, fallback: boolean): boolean {
  const normalized = value.trim().toLowerCase()
  if (normalized === '') return fallback
  if (normalized === 'true') return true
  if (normalized === 'false') return false
  throw new Error(`${name} must be true or false.`)
}

function readInputs(core: Core): Inputs {
  const input = (name: string): string => core.getInput(name)
  return {
    workingDirectory: input('workingDirectory') || '.',
    testArgs: input('testArgs'),
    flutterCommand: input('flutterCommand') || 'flutter',
    coverage: parseBoolean('coverage', input('coverage'), false),
    coverageThreshold: parseThreshold(
      'coverageThreshold',
      input('coverageThreshold')
    ),
    changedLinesCoverageThreshold: parseThreshold(
      'changedLinesCoverageThreshold',
      input('changedLinesCoverageThreshold')
    ),
    annotateUncoveredLines: parseBoolean(
      'annotateUncoveredLines',
      input('annotateUncoveredLines'),
      true
    ),
    machinePath: input('machinePath'),
    coveragePath: input('coveragePath'),
    failOnError: parseBoolean('failOnError', input('failOnError'), true),
    title: input('title') || 'Flutter test results',
    token: input('token')
  }
}

export async function run(): Promise<void> {
  const core = await import('@actions/core')
  try {
    const inputs = readInputs(core)
    const paths = createPathContext(inputs.workingDirectory)

    let machinePath = inputs.machinePath
    let coveragePath = inputs.coveragePath
    let exitCode: number | undefined
    let stderrTail: string[] = []

    // With neither file given, run the tests. Otherwise only report.
    if (!machinePath && !coveragePath) {
      const result = await runFlutterTest({
        flutterCommand: inputs.flutterCommand,
        workingDirectory: inputs.workingDirectory,
        testArgs: inputs.testArgs,
        coverage: inputs.coverage,
        outputPath: path.join(
          process.env['RUNNER_TEMP'] || os.tmpdir(),
          `flutter-test-machine-${Date.now()}.json`
        )
      })
      exitCode = result.exitCode
      stderrTail = result.stderrTail
      machinePath = result.machinePath
      coveragePath = result.coveragePath ?? ''
      core.setOutput('exit-code', exitCode.toString())
      core.setOutput('machine-path', machinePath)
    }

    let testRun: TestRun | undefined
    if (machinePath) {
      const parsed = await parseMachineFile(machinePath)
      testRun = parsed.run
      if (parsed.invalidLines > 0) {
        core.debug(`Skipped ${parsed.invalidLines} lines that were not JSON.`)
      }
    }
    const coverage: CoverageData | undefined = coveragePath
      ? await parseLcovFile(coveragePath)
      : undefined

    // The context gives the links in the report even without a token.
    const github = await import('@actions/github')
    const context: RunContext = readContext(github)
    const octokit = inputs.token ? github.getOctokit(inputs.token) : undefined

    let changedLines: ChangedLinesCoverage | undefined
    if (octokit && context.pullNumber && coverage) {
      try {
        const files = await fetchChangedFiles(octokit, context)
        changedLines = computeChangedLinesCoverage(files, coverage, paths)
      } catch (error) {
        core.warning(
          `Could not read the changed files of the pull request: ${(error as Error).message}`
        )
      }
    }

    const report = buildReport({
      title: inputs.title,
      run: testRun,
      coverage,
      changedLines,
      exitCode,
      stderrTail,
      coverageThreshold: inputs.coverageThreshold,
      changedLinesCoverageThreshold: inputs.changedLinesCoverageThreshold,
      paths,
      links: context.links
    })

    setOutputs(core, report)
    logReport(core, report)
    await writeStepSummary(core, report)

    if (octokit) {
      await publish(core, octokit, context, report, inputs)
    } else {
      core.info(
        'Skipping the check run and pull request comment because no token was provided.'
      )
    }

    if (report.conclusion === 'failure') {
      if (inputs.failOnError) {
        core.setFailed(failureMessage(report))
      } else {
        core.warning(failureMessage(report))
      }
    }
  } catch (error) {
    core.setFailed(
      error instanceof Error ? (error.stack ?? error.message) : String(error)
    )
  }
}

async function publish(
  core: Core,
  octokit: Octokit,
  context: RunContext,
  report: Report,
  inputs: Inputs
): Promise<void> {
  // The comment links to the check run, so create the check run first.
  try {
    const checkRunUrl = await createCheckRun(octokit, context, {
      name: inputs.title,
      conclusion: report.conclusion,
      title: checkTitle(report),
      summary: renderCheckSummary(report),
      text: renderCheckText(report),
      annotations: buildAnnotations(report, {
        annotateUncoveredLines: inputs.annotateUncoveredLines
      })
    })
    if (checkRunUrl) {
      report.links = {...context.links, checkRunUrl}
      core.setOutput('check-run-url', checkRunUrl)
    }
  } catch (error) {
    core.warning(
      `Could not create the check run. Grant "checks: write" to the job to enable it. ${(error as Error).message}`
    )
  }

  if (!context.pullNumber) {
    core.info(
      'Skipping the pull request comment because the workflow is not running for a pull request.'
    )
    return
  }
  try {
    await upsertComment(octokit, context, inputs.title, renderComment(report))
  } catch (error) {
    core.warning(
      `Could not write the pull request comment. Grant "pull-requests: write" to the job to enable it. ${(error as Error).message}`
    )
  }
}

function checkTitle(report: Report): string {
  const parts: string[] = []
  if (report.tests) {
    if (report.tests.failed > 0) parts.push(`${report.tests.failed} failed`)
    if (report.tests.loadFailures.length > 0) {
      parts.push(`${report.tests.loadFailures.length} failed to load`)
    }
    parts.push(`${report.tests.passed} passed`)
    if (report.tests.skipped > 0) parts.push(`${report.tests.skipped} skipped`)
  }
  if (report.coverage?.lines.percent !== undefined) {
    parts.push(`coverage ${report.coverage.lines.percent.toFixed(1)}%`)
  }
  return parts.join(', ') || report.title
}

function failureMessage(report: Report): string {
  const reasons: string[] = []
  if (report.tests && report.tests.failed > 0) {
    reasons.push(`${report.tests.failed} test(s) failed.`)
  }
  if (report.tests && report.tests.loadFailures.length > 0) {
    reasons.push(
      `${report.tests.loadFailures.length} test file(s) failed to load.`
    )
  }
  reasons.push(...report.problems.map(p => p.replace(/`/gu, '')))
  return reasons.join(' ')
}

function setOutputs(core: Core, report: Report): void {
  core.setOutput('conclusion', report.conclusion)
  if (report.tests) {
    core.setOutput('tests', report.tests.total.toString())
    core.setOutput('passed', report.tests.passed.toString())
    core.setOutput('failed', report.tests.failed.toString())
    core.setOutput('skipped', report.tests.skipped.toString())
    core.setOutput('duration', Math.round(report.tests.durationMs).toString())
  }
  if (report.coverage) {
    core.setOutput('coverage', report.coverage.lines.percent?.toFixed(1) ?? '')
    core.setOutput('coverage-hit', report.coverage.lines.hit.toString())
    core.setOutput('coverage-found', report.coverage.lines.found.toString())
  }
  if (report.changedLines) {
    core.setOutput(
      'changed-lines-coverage',
      report.changedLines.percent?.toFixed(1) ?? ''
    )
  }
}

function logReport(core: Core, report: Report): void {
  const tests = report.tests
  if (tests) {
    core.info(
      `${tests.failed} failed, ${tests.passed} passed, ${tests.skipped} skipped in ${formatDuration(tests.durationMs)}.`
    )
    for (const failure of tests.failures) {
      const location = `${failure.displayPath}${failure.line ? `:${failure.line}` : ''}`
      core.startGroup(`❌ ${failure.name} (${location})`)
      const {messages, output} = failureDetails(failure.test)
      for (const message of messages) {
        core.info(message.text)
        if (message.stackTrace) core.info(message.stackTrace)
      }
      if (output.length > 0) core.info(`Output:\n${output.join('\n')}`)
      core.endGroup()
    }
    for (const failure of tests.loadFailures) {
      core.startGroup(`💥 Failed to load ${failure.displayPath}`)
      for (const error of failure.errors) {
        core.info(cleanErrorMessage(error.message))
      }
      core.endGroup()
    }
  }
}

async function writeStepSummary(core: Core, report: Report): Promise<void> {
  const summaryPath = process.env['GITHUB_STEP_SUMMARY']
  if (!summaryPath) return
  try {
    await promises.appendFile(
      summaryPath,
      `${renderStepSummary(report)}\n\n`,
      'utf8'
    )
  } catch (error) {
    core.warning(
      `Could not write the step summary: ${(error as Error).message}`
    )
  }
}

run()
