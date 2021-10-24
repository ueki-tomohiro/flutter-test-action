import * as core from '@actions/core'
import {Parser} from './parser'

async function run(): Promise<void> {
  try {
    const inputPath: string = core.getInput('path')
    const parser = Parser(inputPath)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
