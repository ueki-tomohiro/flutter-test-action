import {Conclusion, Reporter} from './model/reporter'
import {Coverage, CoverageFromJSON} from './model'
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
      parse(this.inputPath, (error: string, info: any) => {
        if (error !== null) {
          reject(error)
          return
        }
        this.results = info.map(CoverageFromJSON)

        resolve()
      })
    })
  }

  toReport(): Reporter {
    const results = this.results
    if (!results) {
      return new Reporter({
        summary: '',
        detail: '',
        comment: '',
        annotations: [],
        status: 'failure'
      })
    }

    const summary: string[] = [`### Coverage\n`].concat(
      results.map(r => r.lines.toSummary(r.file))
    )
    const allLines = results.flatMap(r => r.lines)
    const testCount = {found: 0, hit: 0}
    for (const line of allLines) {
      testCount.found += line.found
      testCount.hit += line.hit
    }

    const status: Conclusion =
      testCount.found > 0
        ? testCount.hit / testCount.found > 0.8
          ? 'success'
          : 'failure'
        : 'failure'

    const icon = status === 'success' ? ':white_check_mark:' : `:x:`

    const comment: string[] = [
      `#### ${icon} Coverage`,
      '|Coverage|Stat|',
      '|----|----|'
    ]
    if (testCount.found > 0) {
      comment.push(
        `|${testCount.hit} / ${testCount.found}|${
          Math.round((testCount.hit / testCount.found) * 1000) / 10
        }|`
      )
    }
    comment.push('')

    return new Reporter({
      summary: summary.join(''),
      detail: '',
      comment: comment.join(`\n`),
      annotations: [],
      status
    })
  }
}
