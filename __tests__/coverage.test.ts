import {CoverageParser} from '../src/coverage'

describe('Paraser', () => {
  test('parse json', async () => {
    const parser = new CoverageParser('__tests__/data/lcov.info')
    await parser.parseObject()
    expect(parser.result.functions.length).toEqual(4)
  })
})
