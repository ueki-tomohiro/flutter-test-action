import * as core from '@actions/core'
import {Coverage} from './coverage'
import {Parser} from './parser'
import {exportReport} from './formatter'

async function run(): Promise<void> {
  try {
    if (core.getInput('machinePath')) {
      const machinePath: string = core.getInput('machinePath')
      const parser = new Parser(machinePath)
      await parser.parseObject()
      await exportReport(parser.toReport())
    }
    if (core.getInput('coveragePath') === 'true') {
      const coveragePath = 'coverage/lcov.info'
      const coverrage = new Coverage(coveragePath)
      await coverrage.parseObject()
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
