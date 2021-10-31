import {CoverageParser} from '../src/coverage'

describe('Coverage', () => {
  test('parse json', async () => {
    const parser = new CoverageParser('__tests__/data/lcov.info')
    await parser.parseObject()
    expect(parser.results?.length).toBe(5)
  })
})
