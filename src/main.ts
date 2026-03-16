import {CoverageParser} from './coverage'
import {Parser} from './parser'
import {exportReport} from './formatter'

function parseCoverageThreshold(value: string): number {
  const threshold = Number(value)
  if (Number.isNaN(threshold) || threshold < 0 || threshold > 100) {
    throw new Error('coverageThreshold must be a number between 0 and 100.')
  }
  return threshold
}

async function run(): Promise<void> {
  try {
    const core = await import('@actions/core')
    let parser: Parser | undefined
    let coverage: CoverageParser | undefined
    const machinePath = core.getInput('machinePath')
    const coveragePath = core.getInput('coveragePath')

    if (!machinePath && !coveragePath) {
      throw new Error('Either machinePath or coveragePath must be provided.')
    }

    if (machinePath) {
      parser = new Parser(machinePath)
      await parser.parseObject()
    }

    if (coveragePath) {
      coverage = new CoverageParser(coveragePath)
      await coverage.parseObject()
    }

    const coverageThreshold = parseCoverageThreshold(
      core.getInput('coverageThreshold') || '80'
    )

    await exportReport({
      report: parser?.toReport(),
      coverage: coverage?.toReport(coverageThreshold)
    })
  } catch (error) {
    if (error instanceof Error) {
      const core = await import('@actions/core')
      core.setFailed(`${error.name}:${error.message}\n\n${error.stack}`)
    }
  }
}

run()
