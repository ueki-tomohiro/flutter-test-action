import {promises} from 'fs'
import {TestCase, TestError, TestRun, TestSuite} from './model/test-run'

/* eslint-disable @typescript-eslint/no-explicit-any */

interface PendingTest {
  id: number
  suiteId: number
  groupIds: number[]
  name: string
  url?: string
  line?: number
  rootUrl?: string
  rootLine?: number
  skipReason?: string
  startTime: number
  errors: TestError[]
  prints: string[]
  // An error reported after testDone, such as "This test failed after it had
  // already completed". testDone still says success in that case.
  failedAfterDone: boolean
  done?: {result: string; skipped: boolean; hidden: boolean; time: number}
}

export interface ParseResult {
  run: TestRun
  // Lines that were not valid JSON, such as plain log output.
  invalidLines: number
}

export async function parseMachineFile(path: string): Promise<ParseResult> {
  const content = await promises.readFile(path, 'utf8')
  return parseMachineOutput(content)
}

/**
 * Builds a test run from the JSON lines written by `flutter test --machine`.
 *
 * @see https://github.com/dart-lang/test/blob/master/pkgs/test/doc/json_reporter.md
 */
export function parseMachineOutput(content: string): ParseResult {
  const suites = new Map<number, TestSuite>()
  const groupNames = new Map<number, string>()
  const tests = new Map<number, PendingTest>()
  const run: TestRun = {suites: []}
  let invalidLines = 0

  for (const line of content.split(/\r?\n/u)) {
    if (line.trim().length === 0) continue

    let event: any
    try {
      event = JSON.parse(line)
    } catch {
      invalidLines++
      continue
    }
    // Flutter also writes `[{"event": ...}]` lines for the daemon protocol.
    if (event === null || typeof event !== 'object' || Array.isArray(event)) {
      continue
    }

    switch (event['type']) {
      case 'suite': {
        const suite = event['suite']
        suites.set(suite['id'], {
          id: suite['id'],
          path: suite['path'] ?? '',
          platform: suite['platform'] ?? '',
          tests: [],
          loadErrors: []
        })
        break
      }
      case 'group': {
        const group = event['group']
        groupNames.set(group['id'], group['name'] ?? '')
        break
      }
      case 'testStart': {
        const test = event['test']
        tests.set(test['id'], {
          id: test['id'],
          suiteId: test['suiteID'],
          groupIds: test['groupIDs'] ?? [],
          name: test['name'] ?? '',
          url: test['url'] ?? undefined,
          line: test['line'] ?? undefined,
          rootUrl: test['root_url'] ?? undefined,
          rootLine: test['root_line'] ?? undefined,
          skipReason: test['metadata']?.['skipReason'] ?? undefined,
          startTime: event['time'] ?? 0,
          errors: [],
          prints: [],
          failedAfterDone: false
        })
        break
      }
      case 'error': {
        const test = tests.get(event['testID'])
        if (test) {
          test.errors.push({
            message: event['error'] ?? '',
            stackTrace: event['stackTrace'] ?? '',
            isFailure: event['isFailure'] === true
          })
          if (test.done) test.failedAfterDone = true
        }
        break
      }
      case 'print': {
        tests.get(event['testID'])?.prints.push(event['message'] ?? '')
        break
      }
      case 'testDone': {
        const test = tests.get(event['testID'])
        if (test) {
          test.done = {
            result: event['result'],
            skipped: event['skipped'] === true,
            hidden: event['hidden'] === true,
            time: event['time'] ?? test.startTime
          }
        }
        break
      }
      case 'done': {
        run.success = event['success'] ?? undefined
        run.durationMs = event['time'] ?? undefined
        break
      }
    }
  }

  for (const pending of tests.values()) {
    const suite = suites.get(pending.suiteId)
    if (!suite) continue

    const status = toStatus(pending)
    // Hidden tests are the synthetic "loading <path>" test and setUpAll /
    // tearDownAll. They only matter when they fail.
    const hidden = pending.done?.hidden ?? pending.groupIds.length === 0
    if (hidden && status !== 'failure') continue

    if (pending.groupIds.length === 0 && pending.name.startsWith('loading ')) {
      suite.loadErrors.push(...withFallbackError(pending))
      continue
    }

    suite.tests.push(toTestCase(pending, status, groupNames))
  }

  run.suites = [...suites.values()]
  return {run, invalidLines}
}

function toStatus(test: PendingTest): TestCase['status'] {
  if (!test.done) return 'failure'
  if (test.done.result !== 'success' || test.failedAfterDone) return 'failure'
  return test.done.skipped ? 'skipped' : 'success'
}

function withFallbackError(test: PendingTest): TestError[] {
  if (test.errors.length > 0) return test.errors
  const message = test.done
    ? `The test finished with result "${test.done.result}".`
    : 'The test did not finish. The test process may have crashed or timed out.'
  return [{message, stackTrace: '', isFailure: false}]
}

function toTestCase(
  test: PendingTest,
  status: TestCase['status'],
  groupNames: Map<number, string>
): TestCase {
  const innermostGroup = test.groupIds[test.groupIds.length - 1]
  const groupName =
    innermostGroup !== undefined ? groupNames.get(innermostGroup) : undefined

  // Tests written with helpers such as testWidgets report the helper's
  // location in `url` and the caller's location in `root_url`.
  const url = test.rootUrl ?? test.url
  const line = test.rootUrl ? test.rootLine : test.line

  return {
    id: test.id,
    suiteId: test.suiteId,
    name: test.name,
    groupName: groupName || undefined,
    location: url ? {url, line} : undefined,
    status,
    durationMs: Math.max(
      0,
      (test.done?.time ?? test.startTime) - test.startTime
    ),
    skipReason: status === 'skipped' ? test.skipReason : undefined,
    errors: status === 'failure' ? withFallbackError(test) : test.errors,
    prints: test.prints
  }
}
