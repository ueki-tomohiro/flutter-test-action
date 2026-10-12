export interface CoverageCount {
  hit: number
  found: number
}

export interface FileCoverage {
  // Path as written in the `SF:` record of lcov.info.
  path: string
  // Hit count for each instrumented line.
  lineHits: Map<number, number>
  lines: CoverageCount
  functions: CoverageCount
  branches: CoverageCount
}

export interface CoverageData {
  files: FileCoverage[]
  lines: CoverageCount
  functions: CoverageCount
  branches: CoverageCount
}
