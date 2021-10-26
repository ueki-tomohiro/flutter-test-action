import {Parser} from '../src/parser'
import {promises} from 'fs'

const {readFile} = promises

describe('Paraser', () => {
  test('parse json', async () => {
    const parser = new Parser('__tests__/data/result.json')
    await parser.parseObject()
    expect(parser.tests.length).toEqual(4)
  })

  test('check suite', async () => {
    const parser = new Parser('__tests__/data/result.json')
    await parser.parseObject()
    expect(parser.tests[0].id).toEqual(0)
    expect(parser.tests[0].groups.length).toEqual(1)
    expect(parser.tests[0].path).toEqual('/ci_test/test/date_util_test.dart')
  })

  test('check group', async () => {
    const parser = new Parser('__tests__/data/result.json')
    await parser.parseObject()
    expect(parser.tests[0].groups[0].id).toEqual(8)
    expect(parser.tests[0].groups[0].tests.length).toEqual(2)
  })

  test('check test', async () => {
    const parser = new Parser('__tests__/data/result.json')
    await parser.parseObject()
    expect(parser.tests[0].groups[0].tests[0].url).toEqual(
      'file:///ci_test/test/date_util_test.dart'
    )
    expect(parser.tests[0].groups[0].tests[0].suiteId).toEqual(0)
    expect(parser.tests[0].groups[0].tests[0].groupIds[0]).toEqual(8)
  })

  test('check test done', async () => {
    const parser = new Parser('__tests__/data/result.json')
    await parser.parseObject()
    expect(parser.tests[0].groups[0].tests[0].result?.state).toEqual('success')
  })

  test('check test error', async () => {
    const parser = new Parser('__tests__/data/result.json')
    await parser.parseObject()
    expect(parser.tests[3].groups[0].tests[3].result?.error).toContain(
      'Expected'
    )
  })

  test('check unit', async () => {
    const parser = new Parser('__tests__/data/result.json')
    await parser.parseObject()
    const xml = Buffer.from(
      await readFile('__tests__/data/result.xml')
    ).toString('utf8')
    expect(parser.toUnit()).toEqual(xml)
  })
})