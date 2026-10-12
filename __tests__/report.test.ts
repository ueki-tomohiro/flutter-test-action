import {describe, expect, test} from 'vitest'
import {parseMachineFile, parseMachineOutput} from '../src/parser'
import {parseLcovFile} from '../src/coverage'
import {computeChangedLinesCoverage} from '../src/diff'
import {createPathContext} from '../src/paths'
import {ReportInput, buildReport} from '../src/report/build'
import {
  outputLimit,
  renderCheckSummary,
  renderCheckText,
  renderComment
} from '../src/report/markdown'
import {buildAnnotations} from '../src/report/annotations'

const paths = createPathContext('packages/app', '/workspace/repo')
const links = {
  serverUrl: 'https://github.com',
  owner: 'octo',
  repo: 'app',
  sha: '0123456789abcdef',
  runUrl: 'https://github.com/octo/app/actions/runs/1',
  checkRunUrl: 'https://github.com/octo/app/runs/2'
}

async function failingInput(): Promise<ReportInput> {
  const {run} = await parseMachineFile('__tests__/data/result_failure.json')
  const coverage = await parseLcovFile('__tests__/data/lcov_changed.info')
  const changedLines = computeChangedLinesCoverage(
    [
      {path: 'packages/app/lib/login.dart', addedLines: [2, 5, 6, 7, 8, 9]},
      {path: 'packages/app/lib/util.dart', addedLines: [1]},
      {path: 'packages/app/lib/new_page.dart', addedLines: [1, 2, 3]}
    ],
    coverage,
    paths
  )
  return {
    title: 'Unit test results',
    run,
    coverage,
    changedLines,
    exitCode: 1,
    paths,
    links
  }
}

describe('buildReport', () => {
  test('summarizes a failing run', async () => {
    const report = buildReport(await failingInput())

    expect(report.conclusion).toBe('failure')
    expect(report.problems).toEqual([])
    expect(report.tests).toMatchObject({
      total: 5,
      passed: 2,
      failed: 2,
      skipped: 1,
      durationMs: 5000
    })
    expect(report.tests?.failures.map(f => [f.name, f.path, f.line])).toEqual([
      [
        'LoginPage validation › shows error when password is empty',
        'packages/app/test/login_test.dart',
        42
      ],
      [
        'LoginPage › remembers the email',
        'packages/app/test/login_test.dart',
        70
      ]
    ])
    expect(report.tests?.loadFailures.map(f => f.path)).toEqual([
      'packages/app/test/broken_test.dart'
    ])
  })

  test('fails when flutter test exits with an error but no test failed', () => {
    const {run} = parseMachineOutput('{"success":true,"type":"done","time":10}')
    const report = buildReport({title: 'T', run, exitCode: 1, paths})

    expect(report.conclusion).toBe('failure')
    expect(report.problems[0]).toMatch(/exited with code 1/)
  })

  test('fails when the runner reports a failed run without failed tests', () => {
    const {run} = parseMachineOutput(
      [
        '{"suite":{"id":0,"platform":"vm","path":"/a_test.dart"},"type":"suite","time":0}',
        '{"group":{"id":1,"suiteID":0,"parentID":null,"name":""},"type":"group","time":1}',
        '{"test":{"id":2,"name":"a","suiteID":0,"groupIDs":[1],"metadata":{"skip":false},"line":3,"url":"file:///a_test.dart"},"type":"testStart","time":2}',
        '{"testID":2,"result":"success","skipped":false,"hidden":false,"type":"testDone","time":3}',
        '{"success":false,"type":"done","time":5}'
      ].join('\n')
    )
    const report = buildReport({title: 'T', run, paths})

    expect(report.conclusion).toBe('failure')
    expect(report.problems[0]).toMatch(/reported a failed run/)
  })

  test('fails when a threshold is set but its data is missing', () => {
    const {run} = parseMachineOutput(
      '{"suite":{"id":0,"platform":"vm","path":"/a_test.dart"},"type":"suite","time":0}\n' +
        '{"group":{"id":1,"suiteID":0,"parentID":null,"name":""},"type":"group","time":1}\n' +
        '{"test":{"id":2,"name":"a","suiteID":0,"groupIDs":[1],"metadata":{"skip":false},"line":3,"url":"file:///a_test.dart"},"type":"testStart","time":2}\n' +
        '{"testID":2,"result":"success","skipped":false,"hidden":false,"type":"testDone","time":3}\n' +
        '{"success":true,"type":"done","time":5}'
    )

    expect(
      buildReport({title: 'T', run, coverageThreshold: 80, paths}).problems
    ).toEqual([
      'A coverage threshold is set, but no coverage was reported. Enable `coverage` or pass `coveragePath`.'
    ])
    expect(
      buildReport({
        title: 'T',
        run,
        changedLinesCoverageThreshold: 80,
        changedLinesUnavailable: 'no token was provided.',
        paths
      }).problems
    ).toEqual([
      'A threshold for changed lines is set, but their coverage could not be computed: no token was provided.'
    ])
    // Outside of pull requests there are no changed lines to check.
    expect(
      buildReport({title: 'T', run, changedLinesCoverageThreshold: 80, paths})
        .conclusion
    ).toBe('success')
  })

  test('applies coverage thresholds only when they are set', async () => {
    const input = await failingInput()
    const passing = {...input, run: undefined, exitCode: undefined}

    expect(buildReport(passing).conclusion).toBe('success')
    expect(buildReport({...passing, coverageThreshold: 80}).problems).toEqual([
      'Coverage 62.5% is below the threshold of 80%.'
    ])
    expect(
      buildReport({...passing, changedLinesCoverageThreshold: 60}).problems
    ).toEqual([
      'Coverage of changed lines 50.0% is below the threshold of 60%.'
    ])
  })
})

describe('markdown', () => {
  test('renders the pull request comment of a failing run', async () => {
    const report = buildReport(await failingInput())

    await expect(renderComment(report)).toMatchFileSnapshot(
      '__snapshots__/comment-failure.md'
    )
  })

  test('renders the check run of a failing run', async () => {
    const report = buildReport(await failingInput())

    await expect(renderCheckSummary(report)).toMatchFileSnapshot(
      '__snapshots__/check-summary-failure.md'
    )
    await expect(renderCheckText(report)).toMatchFileSnapshot(
      '__snapshots__/check-text-failure.md'
    )
  })

  test('renders a short comment for a passing run', async () => {
    const {run} = await parseMachineFile('__tests__/data/result.json')
    const coverage = await parseLcovFile('__tests__/data/lcov.info')
    const report = buildReport({
      title: 'Unit test results',
      run,
      coverage,
      exitCode: 0,
      paths: createPathContext('.', '/ci_test'),
      links
    })

    await expect(renderComment(report)).toMatchFileSnapshot(
      '__snapshots__/comment-success.md'
    )
  })

  test('keeps the comment within the size limit', () => {
    const lines = [
      '{"suite":{"id":0,"platform":"vm","path":"/workspace/repo/packages/app/test/a_test.dart"},"type":"suite","time":0}',
      '{"group":{"id":1,"suiteID":0,"parentID":null,"name":""},"type":"group","time":0}'
    ]
    for (let id = 2; id < 1002; id++) {
      lines.push(
        JSON.stringify({
          test: {
            id,
            name: `test ${id}`,
            suiteID: 0,
            groupIDs: [1],
            metadata: {skip: false},
            line: id,
            url: 'file:///workspace/repo/packages/app/test/a_test.dart'
          },
          type: 'testStart',
          time: 0
        }),
        JSON.stringify({
          testID: id,
          error: 'x'.repeat(2000),
          stackTrace: 'test/a_test.dart 1:1  main\n'.repeat(50),
          isFailure: true,
          type: 'error',
          time: 1
        }),
        JSON.stringify({
          testID: id,
          result: 'failure',
          hidden: false,
          type: 'testDone',
          time: 2
        })
      )
    }
    const {run} = parseMachineOutput(lines.join('\n'))
    const report = buildReport({title: 'T', run, exitCode: 1, paths, links})

    const comment = renderComment(report)
    const summary = renderCheckSummary(report)
    expect(comment.length).toBeLessThanOrEqual(outputLimit)
    expect(summary.length).toBeLessThanOrEqual(outputLimit)
    expect(comment).toMatch(/…and [\d,]+ more/)
    expect(comment).toContain(
      '[Full report](https://github.com/octo/app/runs/2)'
    )
  })
})

describe('buildAnnotations', () => {
  test('annotates failures at their definition and uncovered changed lines', async () => {
    const report = buildReport(await failingInput())

    const annotations = buildAnnotations(report, {annotateUncoveredLines: true})

    expect(
      annotations.map(a => [
        a.annotation_level,
        a.path,
        a.start_line,
        a.end_line
      ])
    ).toEqual([
      ['failure', 'packages/app/test/login_test.dart', 42, 42],
      ['failure', 'packages/app/test/login_test.dart', 70, 70],
      ['failure', 'packages/app/test/broken_test.dart', 1, 1],
      ['notice', 'packages/app/lib/login.dart', 5, 6],
      ['notice', 'packages/app/lib/login.dart', 9, 9]
    ])
    expect(annotations[0].message).toContain("Expected: 'Password is required'")
  })

  test('can skip uncovered line annotations', async () => {
    const report = buildReport(await failingInput())

    const annotations = buildAnnotations(report, {
      annotateUncoveredLines: false
    })

    expect(annotations.every(a => a.annotation_level === 'failure')).toBe(true)
  })
})
