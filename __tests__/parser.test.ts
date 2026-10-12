import {describe, expect, test} from 'vitest'
import {parseMachineFile, parseMachineOutput} from '../src/parser'

describe('parseMachineFile', () => {
  test('parses the suites and tests of a passing run', async () => {
    const {run} = await parseMachineFile('__tests__/data/result.json')

    expect(run.suites.map(s => s.path)).toEqual([
      '/ci_test/test/date_util_test.dart',
      '/ci_test/test/widget_test.dart',
      '/ci_test/test/list_item_test.dart'
    ])
    const tests = run.suites.flatMap(s => s.tests)
    expect(tests).toHaveLength(3)
    expect(tests.every(t => t.status === 'success')).toBe(true)
  })

  test('uses root_url for tests defined through helpers', async () => {
    const {run} = await parseMachineFile('__tests__/data/result.json')
    const widgetTest = run.suites[1].tests[0]

    expect(widgetTest.location).toEqual({
      url: 'file:///ci_test/test/widget_test.dart',
      line: 14
    })
  })

  test('fails when the input file does not exist', async () => {
    await expect(
      parseMachineFile('__tests__/data/missing.json')
    ).rejects.toThrow(/missing\.json/)
  })
})

describe('parseMachineOutput with failures', async () => {
  const {run, invalidLines} = await parseMachineFile(
    '__tests__/data/result_failure.json'
  )
  const tests = run.suites.flatMap(s => s.tests)
  const byId = (id: number) => tests.find(t => t.id === id)

  test('skips lines that are not JSON', () => {
    expect(invalidLines).toBe(1)
  })

  test('reads the result of the done event', () => {
    expect(run.success).toBe(false)
    expect(run.durationMs).toBe(5000)
  })

  test('decides the status from testDone only', () => {
    expect(byId(7)?.status).toBe('failure')
    expect(byId(8)?.status).toBe('success')
    expect(byId(9)?.status).toBe('failure')
    expect(byId(10)?.status).toBe('skipped')
    expect(byId(11)?.status).toBe('success')
  })

  test('keeps print output without failing the test', () => {
    expect(byId(8)?.prints).toEqual(['debug: password ok'])
    expect(byId(8)?.errors).toEqual([])
  })

  test('collects errors of failed tests', () => {
    expect(byId(9)?.errors).toEqual([
      expect.objectContaining({
        message: 'Expected: <true>\n  Actual: <false>\n',
        isFailure: true
      })
    ])
  })

  test('computes the duration of each test', () => {
    expect(byId(7)?.durationMs).toBe(340)
    expect(byId(11)?.durationMs).toBe(3000)
  })

  test('keeps the skip reason', () => {
    expect(byId(10)?.skipReason).toBe('Waiting for the passkey API')
  })

  test('records the innermost group name', () => {
    expect(byId(7)?.groupName).toBe('LoginPage validation')
    expect(byId(11)?.groupName).toBeUndefined()
  })

  test('reports suites that failed to load', () => {
    const broken = run.suites.find(s => s.path.endsWith('broken_test.dart'))

    expect(broken?.tests).toEqual([])
    expect(broken?.loadErrors[0].message).toContain(
      "Error: Method not found: 'missing'."
    )
  })

  test('does not count hidden tests that passed', () => {
    expect(tests.map(t => t.id)).toEqual([7, 8, 9, 10, 11])
  })
})

describe('parseMachineOutput edge cases', () => {
  test('treats a test without testDone as failed', () => {
    const {run} = parseMachineOutput(
      [
        '{"suite":{"id":0,"platform":"vm","path":"/a_test.dart"},"type":"suite","time":0}',
        '{"group":{"id":1,"suiteID":0,"parentID":null,"name":""},"type":"group","time":1}',
        '{"test":{"id":2,"name":"hangs","suiteID":0,"groupIDs":[1],"metadata":{"skip":false},"line":3,"url":"file:///a_test.dart"},"type":"testStart","time":2}'
      ].join('\n')
    )

    const [test] = run.suites[0].tests
    expect(test.status).toBe('failure')
    expect(test.errors[0].message).toMatch(/did not finish/)
    expect(run.success).toBeUndefined()
  })

  test('fails a test that reports an error after testDone', () => {
    const {run} = parseMachineOutput(
      [
        '{"suite":{"id":0,"platform":"vm","path":"/a_test.dart"},"type":"suite","time":0}',
        '{"group":{"id":1,"suiteID":0,"parentID":null,"name":""},"type":"group","time":1}',
        '{"test":{"id":2,"name":"leaks","suiteID":0,"groupIDs":[1],"metadata":{"skip":false},"line":3,"url":"file:///a_test.dart"},"type":"testStart","time":2}',
        '{"testID":2,"result":"success","skipped":false,"hidden":false,"type":"testDone","time":3}',
        '{"testID":2,"error":"This test failed after it had already completed.","stackTrace":"","isFailure":false,"type":"error","time":4}',
        '{"success":false,"type":"done","time":5}'
      ].join('\n')
    )

    const [test] = run.suites[0].tests
    expect(test.status).toBe('failure')
    expect(test.errors[0].message).toMatch(/after it had already completed/)
  })

  test('reports failed setUpAll as a failure', () => {
    const {run} = parseMachineOutput(
      [
        '{"suite":{"id":0,"platform":"vm","path":"/a_test.dart"},"type":"suite","time":0}',
        '{"group":{"id":1,"suiteID":0,"parentID":null,"name":""},"type":"group","time":1}',
        '{"test":{"id":2,"name":"(setUpAll)","suiteID":0,"groupIDs":[1],"metadata":{"skip":false},"line":3,"url":"file:///a_test.dart"},"type":"testStart","time":2}',
        '{"testID":2,"error":"boom","stackTrace":"","isFailure":false,"type":"error","time":3}',
        '{"testID":2,"result":"error","skipped":false,"hidden":true,"type":"testDone","time":4}'
      ].join('\n')
    )

    expect(run.suites[0].tests.map(t => [t.name, t.status])).toEqual([
      ['(setUpAll)', 'failure']
    ])
  })
})
