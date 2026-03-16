import {Coverage, CoverageFromJSON} from './model'
import {Reporter} from './model/reporter'
// eslint-disable-next-line import/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const parse = require('lcov-parse')

export class CoverageParser {
  readonly inputPath: string
  results: Coverage[] | undefined

  constructor(inputPath: string) {
    this.inputPath = inputPath
  }

  async parseObject(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parse(this.inputPath, (error: Error | null, info: any) => {
        if (error) {
          reject(error)
          return
        }
        this.results = info.map(CoverageFromJSON)
        resolve()
      })
    })
  }

  toReport(threshold = 80): Reporter {
    const results = this.results?.flatMap(r => r.lines)
    if (!results) {
      return new Reporter({
        summary: '',
        detail: '',
        comment: '',
        annotations: [],
        status: 'failure',
        outputs: {}
      })
    }

    const summary: string[] = ['### Coverage\n'].concat(
      this.results?.map(f => f.toSummary()) ?? []
    )

    const summaryCount = {hit: 0, found: 0}
    for (const line of results) {
      summaryCount.hit += line.hit
      summaryCount.found += line.found
    }

    const state =
      summaryCount.found > 0
        ? Math.round((summaryCount.hit / summaryCount.found) * 1000) / 10
        : 0
    const icon = state >= threshold ? ':white_check_mark:' : ':x:'

    const comment: string[] = []
    comment.push(`#### ${icon} Coverage`)
    comment.push('')
    comment.push(`| Hit | Found | State |`)
    comment.push(`| ---- | ---- | ---- |`)
    comment.push(`| ${summaryCount.hit}| ${summaryCount.found} | ${state} |`)
    comment.push('')

    return new Reporter({
      summary: summary.join(''),
      detail: '',
      comment: comment.join('\n'),
      annotations: [],
      status: state >= threshold ? 'success' : 'failure',
      outputs: {
        coverage: state.toFixed(1),
        'coverage-hit': summaryCount.hit.toString(),
        'coverage-found': summaryCount.found.toString()
      }
    })
  }
}
