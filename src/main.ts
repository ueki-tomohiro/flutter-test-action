import * as core from '@actions/core'
import {Parser} from './parser'
import {exportReport} from './formatter'

async function run(): Promise<void> {
  try {
    const inputPath: string = core.getInput('inputPath')
    const parser = new Parser(inputPath)
    await parser.parseObject()
    exportReport(parser.toReport())
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
