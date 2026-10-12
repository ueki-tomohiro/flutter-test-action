import {describe, expect, test} from 'vitest'
import {parseLcovFile, percentage} from '../src/coverage'

describe('parseLcovFile', () => {
  test('reads each file and the totals', async () => {
    const coverage = await parseLcovFile('__tests__/data/lcov.info')

    expect(coverage.files).toHaveLength(5)
    expect(coverage.files[0].path).toBe('lib/util/date_util.dart')
    expect(coverage.lines.found).toBe(
      coverage.files.reduce((sum, f) => sum + f.lines.found, 0)
    )
  })

  test('keeps the hit count of each line', async () => {
    const coverage = await parseLcovFile('__tests__/data/lcov.info')
    const file = coverage.files[0]

    expect(file.lineHits.get(5)).toBe(3)
    expect(file.lineHits.get(17)).toBe(0)
  })

  test('fails when the file does not exist', async () => {
    await expect(parseLcovFile('__tests__/data/missing.info')).rejects.toThrow(
      /missing\.info/
    )
  })
})

describe('percentage', () => {
  test('rounds down to one decimal place', () => {
    expect(percentage({hit: 2, found: 3})).toBe(66.6)
    expect(percentage({hit: 7999, found: 10000})).toBe(79.9)
  })

  test('returns undefined when nothing was found', () => {
    expect(percentage({hit: 0, found: 0})).toBeUndefined()
  })
})
