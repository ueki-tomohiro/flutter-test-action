import {CoverageCount, CoverageData, FileCoverage} from './model/coverage'
// eslint-disable-next-line import/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const parse = require('lcov-parse')

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function parseLcovFile(path: string): Promise<CoverageData> {
  const records = await new Promise<any[]>((resolve, reject) => {
    parse(path, (error: unknown, info: any[]) => {
      if (error) {
        reject(
          new Error(`Failed to parse coverage file ${path}: ${String(error)}`)
        )
        return
      }
      resolve(info)
    })
  })

  return toCoverageData(records)
}

export function toCoverageData(records: any[]): CoverageData {
  const files = records.filter(Boolean).map(toFileCoverage)

  return {
    files,
    lines: sum(files.map(f => f.lines)),
    functions: sum(files.map(f => f.functions)),
    branches: sum(files.map(f => f.branches))
  }
}

export function percentage({hit, found}: CoverageCount): number | undefined {
  if (found === 0) return undefined
  return Math.floor((hit / found) * 1000) / 10
}

function toFileCoverage(record: any): FileCoverage {
  const lineHits = new Map<number, number>()
  for (const detail of record['lines']?.['details'] ?? []) {
    const line = Number(detail['line'])
    lineHits.set(line, (lineHits.get(line) ?? 0) + Number(detail['hit'] ?? 0))
  }

  return {
    path: record['file'],
    lineHits,
    lines: toCount(record['lines']),
    functions: toCount(record['functions']),
    branches: toCount(record['branches'])
  }
}

function toCount(json: any): CoverageCount {
  return {hit: Number(json?.['hit'] ?? 0), found: Number(json?.['found'] ?? 0)}
}

function sum(counts: CoverageCount[]): CoverageCount {
  return counts.reduce(
    (total, count) => ({
      hit: total.hit + count.hit,
      found: total.found + count.found
    }),
    {hit: 0, found: 0}
  )
}
