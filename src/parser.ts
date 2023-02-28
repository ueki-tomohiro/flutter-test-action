import * as core from '@actions/core'
import * as os from 'os'
import {Conclusion, Reporter} from './model/reporter'
import {
  TestDone,
  TestDoneFromJSON,
  TestGroupFromJSON,
  TestStartFromJSON,
  TestSuite,
  TestSuiteFromJSON
} from './model'
import {Annotation} from './model/annotation'
import format from 'xml-formatter'
import {promises} from 'fs'

const {readFile, stat} = promises

export class Parser {
  readonly inputPath: string
  tests: TestSuite[] = []

  constructor(inputPath: string) {
    this.inputPath = inputPath
  }

  async _load(): Promise<string> {
    return new Promise<string>(async resolve => {
      try {
        await stat(this.inputPath)
        const buf = await readFile(this.inputPath)
        resolve(Buffer.alloc(buf.length, buf).toString('utf8'))
      } catch (error) {
        core.error((error as Error).message)
      }
    })
  }

  async parseObject(): Promise<void> {
    const file = await this._load()
    const lines = file.split(os.EOL).filter(line => line.length > 0)

    for (const line of lines) {
      this._parseLine(line)
    }
  }

  _parseLine(line: string): void {
    try {
      const json = JSON.parse(line)
      if (json['type']) {
        this._parseTestSuite(json)
        this._parseTestGroup(json)
        this._parseTestStart(json)
        this._parseTestError(json)
        this._parseTestMessage(json)
        this._parseTestDone(json)
      }
    } catch (error) {
      core.error((error as Error).message)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _parseTestSuite(line: any): void {
    if (line['type'] === 'suite') {
      this.tests.push(TestSuiteFromJSON(line))
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _parseTestGroup(line: any): void {
    if (line['type'] === 'group') {
      const group = TestGroupFromJSON(line)
      const test = this.tests.find(t => t.id === group.suiteId)
      if (!test) return
      test.groups.push(group)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _parseTestStart(line: any): void {
    if (line['type'] === 'testStart') {
      const name: string = line['test']['name']

      if (name.startsWith('loading /')) {
        return
      }
      const start = TestStartFromJSON(line)
      const test = this.tests.find(t => t.id === start.suiteId)
      if (!test) return
      const group = test.findTestGroup(start.groupIds)
      if (!group) return
      group.tests.push(start)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _parseTestError(line: any): void {
    if (line['type'] === 'error') {
      this._checkResult(TestDoneFromJSON(line))
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _parseTestMessage(line: any): void {
    if (line['type'] === 'print') {
      // skip
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _parseTestDone(line: any): void {
    if (line['type'] === 'testDone') {
      this._checkResult(TestDoneFromJSON(line))
    }
  }

  _checkResult(result: TestDone): void {
    const test = this.tests.find(t => t.findTestStart(result.id))
    if (!test) return
    const start = test.findTestStart(result.id)
    if (!start) return
    if (!start.result) {
      start.result = result
    } else if (result.error) {
      start.result.error = result.error
    } else if (result.stackTrace) {
      start.result.stackTrace = result.stackTrace
    }
  }

  toUnit(): string {
    const lines: string[] = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      '<testsuites>'
    ]

    for (const model of this.tests) {
      lines.push(model.toUnit())
    }

    lines.push('</testsuites>')
    return format(lines.join('\n'))
  }

  toReport(): Reporter {
    const summary: string[] = this.tests.map(test => test.toSummary())
    const detail: string[] = [
      '### Unit Test',
      '',
      '|Test|Status|Time|',
      '|----|----|----|'
    ]

    const allTests = this.tests.flatMap(test =>
      test.groups.flatMap(g => g.tests)
    )

    const detailColumn: string[] = allTests.map(test => test.toDetail())

    const annotations = allTests
      .map(test => test.toAnnotation())
      .filter(a => a !== undefined) as Annotation[]

    const status: Conclusion =
      allTests.filter(t => t.result?.state === 'failure').length > 0
        ? 'failure'
        : 'success'

    const icon = status === 'success' ? ':white_check_mark:' : ':x:'

    const comment: string[] = []
    comment.push(`#### ${icon} Unit Test`)
    comment.push('')
    comment.push(`| Test | Success | Failure |`)
    comment.push(`| ---- | ---- | ---- |`)
    comment.push(
      `| ${allTests.length}| ${
        allTests.filter(t => t.result?.state === 'success').length
      } | ${allTests.filter(t => t.result?.state === 'failure').length} |`
    )
    comment.push('')

    return new Reporter({
      summary: summary.join(''),
      detail: detail.concat(detailColumn).join('\n'),
      comment: comment.join('\n'),
      annotations,
      status
    })
  }
}
