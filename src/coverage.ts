import * as core from '@actions/core'
// eslint-disable-next-line import/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const parse = require('lcov-parse')

export class Coverage {
  readonly inputPath: string

  constructor(inputPath: string) {
    this.inputPath = inputPath
  }

  async parseObject(): Promise<void> {
    const info = await parse(this.inputPath)
    core.info(info)
  }
}
