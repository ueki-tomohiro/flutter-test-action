import {CoverageData} from './model/coverage'
import {PathContext, toRepoPath} from './paths'

export interface ChangedFile {
  // Path relative to the repository root.
  path: string
  addedLines: number[]
}

export interface LineRange {
  start: number
  end: number
}

export interface ChangedFileCoverage {
  path: string
  // Added lines that are instrumented, and how many of them ran.
  covered: number
  total: number
  uncovered: LineRange[]
}

export interface ChangedLinesCoverage {
  files: ChangedFileCoverage[]
  covered: number
  total: number
  // Changed Dart files under lib/ that do not appear in lcov.info at all,
  // which means no test imports them.
  missingFiles: string[]
}

/**
 * Returns the line numbers added by a unified diff patch, as returned by the
 * GitHub pull request files API.
 */
export function parseAddedLines(patch: string): number[] {
  const added: number[] = []
  let newLine = 0

  for (const line of patch.split('\n')) {
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/u.exec(line)
    if (hunk) {
      newLine = Number(hunk[1])
      continue
    }
    if (newLine === 0) continue

    if (line.startsWith('+')) {
      added.push(newLine)
      newLine++
    } else if (line.startsWith('-') || line.startsWith('\\')) {
      // Removed lines and "\ No newline at end of file" do not exist in the
      // new file.
    } else {
      newLine++
    }
  }

  return added
}

export function computeChangedLinesCoverage(
  changedFiles: ChangedFile[],
  coverage: CoverageData,
  context: PathContext
): ChangedLinesCoverage {
  const coverageByPath = new Map(
    coverage.files.flatMap(file => {
      const repoPath = toRepoPath(file.path, context)
      return repoPath ? [[repoPath, file] as const] : []
    })
  )
  const libPrefix = context.workingDirectory
    ? `${context.workingDirectory}/lib/`
    : 'lib/'

  const result: ChangedLinesCoverage = {
    files: [],
    covered: 0,
    total: 0,
    missingFiles: []
  }

  for (const changed of changedFiles) {
    const fileCoverage = coverageByPath.get(changed.path)
    if (!fileCoverage) {
      if (
        changed.addedLines.length > 0 &&
        changed.path.startsWith(libPrefix) &&
        isHandWrittenDart(changed.path)
      ) {
        result.missingFiles.push(changed.path)
      }
      continue
    }

    const instrumented = [...new Set(changed.addedLines)]
      .filter(line => fileCoverage.lineHits.has(line))
      .sort((a, b) => a - b)
    if (instrumented.length === 0) continue

    let covered = 0
    const uncovered: LineRange[] = []
    let current: LineRange | undefined
    for (const line of instrumented) {
      if ((fileCoverage.lineHits.get(line) ?? 0) > 0) {
        covered++
        current = undefined
        continue
      }
      // Uncovered lines stay in one range until a covered line appears, so
      // blank lines and comments between them do not split the range.
      if (current) {
        current.end = line
      } else {
        current = {start: line, end: line}
        uncovered.push(current)
      }
    }

    result.files.push({
      path: changed.path,
      covered,
      total: instrumented.length,
      uncovered
    })
    result.covered += covered
    result.total += instrumented.length
  }

  return result
}

function isHandWrittenDart(filePath: string): boolean {
  return (
    filePath.endsWith('.dart') &&
    !/\.(g|freezed|mocks|gr|config|gen)\.dart$/u.test(filePath)
  )
}
