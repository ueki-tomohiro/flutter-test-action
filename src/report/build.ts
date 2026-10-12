import {CoverageData} from '../model/coverage'
import {TestCase, TestError, TestRun, TestSuite} from '../model/test-run'
import {ChangedLinesCoverage} from '../diff'
import {PathContext, displayPath, toRepoPath} from '../paths'
import {percentage} from '../coverage'
import {RepositoryLinks, formatPercent} from './format'

export type Conclusion = 'success' | 'failure'

export interface ReportInput {
  title: string
  run?: TestRun
  coverage?: CoverageData
  changedLines?: ChangedLinesCoverage
  exitCode?: number
  stderrTail?: string[]
  coverageThreshold?: number
  changedLinesCoverageThreshold?: number
  paths: PathContext
  links?: RepositoryLinks
}

export interface ReportedTest {
  test: TestCase
  // Name for display, such as "LoginPage › shows an error".
  name: string
  // Path relative to the repository, when the test is inside it.
  path?: string
  displayPath: string
  line?: number
}

export interface LoadFailure {
  path?: string
  displayPath: string
  errors: TestError[]
}

export interface TestFileSummary {
  path?: string
  displayPath: string
  total: number
  passed: number
  failed: number
  skipped: number
  durationMs: number
}

export interface TestReport {
  total: number
  passed: number
  failed: number
  skipped: number
  durationMs: number
  failures: ReportedTest[]
  loadFailures: LoadFailure[]
  skippedTests: ReportedTest[]
  slowest: ReportedTest[]
  files: TestFileSummary[]
}

export interface CoverageFileSummary {
  path?: string
  displayPath: string
  hit: number
  found: number
  percent?: number
}

export interface CoverageReport {
  lines: {hit: number; found: number; percent?: number}
  functions: {hit: number; found: number; percent?: number}
  branches: {hit: number; found: number; percent?: number}
  threshold?: number
  passed: boolean
  files: CoverageFileSummary[]
}

export interface ChangedLinesReport {
  data: ChangedLinesCoverage
  percent?: number
  threshold?: number
  passed: boolean
}

export interface Report {
  title: string
  conclusion: Conclusion
  // Reasons for a failure other than failed tests.
  problems: string[]
  tests?: TestReport
  coverage?: CoverageReport
  changedLines?: ChangedLinesReport
  exitCode?: number
  stderrTail: string[]
  links?: RepositoryLinks
}

const slowestCount = 10

export function buildReport(input: ReportInput): Report {
  const tests = input.run ? buildTestReport(input.run, input.paths) : undefined
  const coverage = input.coverage
    ? buildCoverageReport(input.coverage, input.paths, input.coverageThreshold)
    : undefined
  const changedLines = input.changedLines
    ? buildChangedLinesReport(
        input.changedLines,
        input.changedLinesCoverageThreshold
      )
    : undefined

  const problems: string[] = []
  if (tests) {
    const hasFailures = tests.failed > 0 || tests.loadFailures.length > 0
    if (input.exitCode !== undefined && input.exitCode !== 0 && !hasFailures) {
      problems.push(
        `\`flutter test\` exited with code ${input.exitCode}, but no failed test was found in its output.`
      )
    } else if (tests.total === 0 && !hasFailures) {
      problems.push('No tests were found.')
    } else if (input.run?.success === undefined && !hasFailures) {
      problems.push(
        'The test output ended before the run finished. The test process may have been interrupted.'
      )
    }
  }
  if (coverage && !coverage.passed) {
    problems.push(
      `Coverage ${formatPercent(coverage.lines.percent)} is below the threshold of ${coverage.threshold}%.`
    )
  }
  if (changedLines && !changedLines.passed) {
    problems.push(
      `Coverage of changed lines ${formatPercent(changedLines.percent)} is below the threshold of ${changedLines.threshold}%.`
    )
  }
  if (!tests && !coverage) {
    problems.push('There were no test results or coverage to report.')
  }

  const testsFailed =
    tests !== undefined && (tests.failed > 0 || tests.loadFailures.length > 0)

  return {
    title: input.title,
    conclusion: testsFailed || problems.length > 0 ? 'failure' : 'success',
    problems,
    tests,
    coverage,
    changedLines,
    exitCode: input.exitCode,
    stderrTail: input.stderrTail ?? [],
    links: input.links
  }
}

export function displayName(test: TestCase): string {
  const group = test.groupName
  if (group && test.name.startsWith(`${group} `)) {
    return `${group} › ${test.name.substring(group.length + 1)}`
  }
  return test.name
}

function buildTestReport(run: TestRun, paths: PathContext): TestReport {
  const reported: ReportedTest[] = []
  const files: TestFileSummary[] = []
  const loadFailures: LoadFailure[] = []

  for (const suite of run.suites) {
    const suitePath = toRepoPath(suite.path, paths)
    const suiteDisplayPath = displayPath(suite.path, paths)

    if (suite.loadErrors.length > 0) {
      loadFailures.push({
        path: suitePath,
        displayPath: suiteDisplayPath,
        errors: suite.loadErrors
      })
    }

    for (const test of suite.tests) {
      reported.push(toReportedTest(test, suite, paths))
    }

    if (suite.tests.length > 0) {
      files.push({
        path: suitePath,
        displayPath: suiteDisplayPath,
        total: suite.tests.length,
        passed: count(suite.tests, 'success'),
        failed: count(suite.tests, 'failure'),
        skipped: count(suite.tests, 'skipped'),
        durationMs: suite.tests.reduce((sum, t) => sum + t.durationMs, 0)
      })
    }
  }

  files.sort(
    (a, b) =>
      Number(b.failed > 0) - Number(a.failed > 0) ||
      b.durationMs - a.durationMs ||
      a.displayPath.localeCompare(b.displayPath)
  )

  const all = reported.map(r => r.test)
  const sumOfTests = all.reduce((sum, t) => sum + t.durationMs, 0)

  return {
    total: all.length,
    passed: count(all, 'success'),
    failed: count(all, 'failure'),
    skipped: count(all, 'skipped'),
    durationMs: run.durationMs ?? sumOfTests,
    failures: reported.filter(r => r.test.status === 'failure'),
    loadFailures,
    skippedTests: reported.filter(r => r.test.status === 'skipped'),
    slowest: reported
      .filter(r => r.test.status !== 'skipped')
      .sort((a, b) => b.test.durationMs - a.test.durationMs)
      .slice(0, slowestCount),
    files
  }
}

function toReportedTest(
  test: TestCase,
  suite: TestSuite,
  paths: PathContext
): ReportedTest {
  const locationPath = test.location
    ? toRepoPath(test.location.url, paths)
    : undefined
  const suitePath = toRepoPath(suite.path, paths)

  // Prefer the location of the test definition. When it is outside the
  // repository (for example inside a package), fall back to the test file.
  if (locationPath || !suitePath) {
    return {
      test,
      name: displayName(test),
      path: locationPath,
      displayPath: test.location
        ? displayPath(test.location.url, paths)
        : displayPath(suite.path, paths),
      line: locationPath ? test.location?.line : undefined
    }
  }
  return {
    test,
    name: displayName(test),
    path: suitePath,
    displayPath: suitePath
  }
}

function count(tests: TestCase[], status: TestCase['status']): number {
  return tests.filter(t => t.status === status).length
}

function buildCoverageReport(
  data: CoverageData,
  paths: PathContext,
  threshold: number | undefined
): CoverageReport {
  const withPercent = (c: {
    hit: number
    found: number
  }): CoverageReport['lines'] => ({
    ...c,
    percent: percentage(c)
  })
  const ratio =
    data.lines.found > 0 ? (data.lines.hit / data.lines.found) * 100 : 0

  return {
    lines: withPercent(data.lines),
    functions: withPercent(data.functions),
    branches: withPercent(data.branches),
    threshold,
    passed: threshold === undefined || ratio >= threshold,
    files: data.files
      .filter(file => file.lines.found > 0)
      .map(file => ({
        path: toRepoPath(file.path, paths),
        displayPath: displayPath(file.path, paths),
        hit: file.lines.hit,
        found: file.lines.found,
        percent: percentage(file.lines)
      }))
      .sort(
        (a, b) =>
          (a.percent ?? 0) - (b.percent ?? 0) ||
          b.found - b.hit - (a.found - a.hit)
      )
  }
}

function buildChangedLinesReport(
  data: ChangedLinesCoverage,
  threshold: number | undefined
): ChangedLinesReport {
  const ratio = data.total > 0 ? (data.covered / data.total) * 100 : undefined
  return {
    data,
    percent: percentage({hit: data.covered, found: data.total}),
    threshold,
    passed: threshold === undefined || ratio === undefined || ratio >= threshold
  }
}
