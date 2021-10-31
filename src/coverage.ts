import {Conclusion, Reporter} from './model/reporter'
import {Coverage, CoverageFromJSON} from './model'
import {Annotation} from './model/annotation'
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
    const results = this.results?.flatMap(r => r.functions)
    if (!results) {
      return new Reporter({
        summary: '',
        detail: '',
        annotations: [],
        status: 'failure'
      })
    }

    const summary: string[] = results.map(f => f.toSummary())
    const detail: string[] = ['|Test|Status|Time|', '|----|----|----|']

    const allDetails = results.flatMap(f => f.details)

    const detailColumn: string[] = allDetails.map(d => d.toDetail())

    const annotations = allDetails
      .map(d => d.toAnnotation())
      .filter(a => a !== undefined) as Annotation[]

    const status: Conclusion =
      allDetails.filter(d => d.hit < d.line).length > 0 ? 'failure' : 'success'

    return new Reporter({
      summary: summary.join(''),
      detail: detail.concat(detailColumn).join('\n'),
      annotations,
      status
    })
  }
}
