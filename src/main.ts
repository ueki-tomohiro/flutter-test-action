import {CoverageParser} from './coverage'
import {Parser} from './parser'
import {exportReport} from './formatter'

async function run(): Promise<void> {
  try {
    const core = await import('@actions/core')
    let parser: Parser | undefined
    let coverage: CoverageParser | undefined
    if (core.getInput('machinePath')) {
      const machinePath: string = core.getInput('machinePath')
      parser = new Parser(machinePath)
      await parser.parseObject()
    }
    if (core.getInput('coveragePath')) {
      const coveragePath = core.getInput('coveragePath')
      coverage = new CoverageParser(coveragePath)
      await coverage.parseObject()
    }
    await exportReport({
      report: parser?.toReport(),
      coverage: coverage?.toReport()
    })
  } catch (error) {
    if (error instanceof Error) {
      const core = await import('@actions/core')
      core.setFailed(`${error.name}:${error.message}\n\n${error.stack}`)
    }
  }
}

run()
