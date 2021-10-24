import * as core from '@actions/core'
import * as os from 'os'
import {readFile, stat} from 'fs/promises'
import {TestModel} from './model/testmodel'

export class Parser {
  readonly inputPath: string
  tests: Map<number, TestModel> = new Map<number, TestModel>()

  constructor(inputPath: string) {
    this.inputPath = inputPath
  }

  async load(): Promise<string> {
    return new Promise<string>(async resolve => {
      try {
        await stat(this.inputPath)
        resolve(Buffer.from(await readFile(this.inputPath)).toString('utf8'))
      } catch (error) {
        core.error((error as Error).message)
      }
    })
  }

  async parseObject(): Promise<Map<number, TestModel>> {
    const file = await this.load()
    const lines = file.split(os.EOL)

    for (const line of lines) {
      this._parseLine(line)
    }

    return this.tests
  }

  _parseLine(line: string): void {
    try {
      const json = JSON.parse(line)
      if (json.containsKey('type')) {
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
  _parseTestStart(line: any): void {
    if (line['type'] === 'testStart') {
      const id: number = line['test']['id']
      const name: string = line['test']['name']

      if (name.startsWith('loading /')) {
        return
      }

      let model = this.tests.get(id)
      if (model == null) {
        model = new TestModel()
      }
      model.id = id
      model.name = name
      if (line['test']['metadata']['skip']) {
        model.state = 'skipped'
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _parseTestError(line: any): void {
    if (line['type'] === 'error') {
      const id: number = line['testID']
      const error: string = line['error']

      const model = this.tests.get(id)
      if (model != null) {
        if (!error.startsWith('Test failed. See exception logs above.')) {
          model.error = error.endsWith('\n') ? '\t$error' : '\t$error\n'
        }
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _parseTestMessage(line: any): void {
    if (line['type'] === 'print') {
      const id: number = line['testID']
      const message: string = line['message']

      const model = this.tests.get(id)
      if (model != null && message != null) {
        model.message = '\t$message\n'
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _parseTestDone(line: any): void {
    if (line['type'] === 'testDone') {
      const id: number = line['testID']

      const model = this.tests.get(id)
      if (model != null && model.state == null) {
        model.state = line['result'] === 'success' ? 'success' : 'failure'
      }
    }
  }

  async toUnit(): Promise<string> {}
}
