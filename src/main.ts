import * as core from '@actions/core'
import {Parser} from './parser'
import {promises} from 'fs'
const {writeFile} = promises

async function run(): Promise<void> {
  try {
    const inputPath: string = core.getInput('inputPath')
    const outputPath: string = core.getInput('outputPath')
    const parser = new Parser(inputPath)
    await parser.parseObject()
    const xml = parser.toUnit()
    await writeFile(outputPath, xml)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
