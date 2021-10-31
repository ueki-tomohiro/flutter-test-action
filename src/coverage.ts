import * as core from '@actions/core'
import {Conclusion, Reporter} from './model/reporter'
import {Coverage, CoverageFromJSON} from './model'
import {Annotation} from './model/annotation'
// eslint-disable-next-line import/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const parse = require('lcov-parse')

export class CoverageParser {
  readonly inputPath: string
  result: Coverage | undefined

  constructor(inputPath: string) {
    this.inputPath = inputPath
  }

  async parseObject(): Promise<void> {
    const info = await parse(this.inputPath)
    core.info(this.inputPath)
    core.info(info)
    this.result = CoverageFromJSON(info)
  }

  toReport(): Reporter {
    const result = this.result
    if (!result) {
      return new Reporter({
        summary: '',
        detail: '',
        annotations: [],
        status: 'failure'
      })
    }

    const summary: string[] = result.functions.map(f => f.toSummary())
    const detail: string[] = ['|Test|Status|Time|', '|----|----|----|']

    const allDetails = result.functions.flatMap(f => f.details)

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
