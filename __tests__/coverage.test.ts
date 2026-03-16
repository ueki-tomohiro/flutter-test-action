import {describe, expect, test} from 'vitest'
import {CoverageParser} from '../src/coverage'

describe('Coverage', () => {
  test('parse json', async () => {
    const parser = new CoverageParser('__tests__/data/lcov.info')
    await parser.parseObject()
    expect(parser.results?.length).toBe(5)
  })

  test('applies configurable threshold and outputs', async () => {
    const parser = new CoverageParser('__tests__/data/lcov.info')
    await parser.parseObject()
    const report = parser.toReport(90)

    expect(report.status).toBe('failure')
    expect(report.outputs['coverage']).toBeDefined()
    expect(report.outputs['coverage-hit']).toBeDefined()
    expect(report.outputs['coverage-found']).toBeDefined()
  })
})
