import {TestGroup} from './testgroup'
import {TestStart} from './teststart'

export class TestSuite {
  readonly id: number
  readonly path: string
  readonly platform: string
  readonly time: number
  readonly groups: TestGroup[]

  constructor({
    id,
    path,
    platform,
    time
  }: {
    id: number
    path: string
    platform: string
    time: number
  }) {
    this.id = id
    this.path = path
    this.platform = platform
    this.time = time
    this.groups = []
  }

  findTestStart(testId: number): TestStart | undefined {
    const tests = this.groups.flatMap(g => g.tests)
    return tests.find(test => test.id === testId)
  }

  findTestGroup(groupIds: number[]): TestGroup | undefined {
    return this.groups.find(g => groupIds.includes(g.id))
  }

  get hasError(): boolean {
    const tests = this.groups.flatMap(g => g.tests)
    return tests.filter(test => test.result?.state === 'failure').length > 0
  }

  toUnit(): string {
    const tests = this.groups.flatMap(g => g.tests)
    const error = tests.filter(test => test.result?.state === 'failure')

    const lines: string[] = [
      `<testsuite id="${this.id}" package="${this.path}" tests="${tests.length}" failures="${error.length}" time="${this.time}">`
    ]

    for (const model of this.groups) {
      lines.push(model.toUnit())
    }

    lines.push('</testsuite>')
    return lines.join('\n')
  }

  toReport(): string {
    const tests = this.groups.flatMap(g => g.tests)
    const success = tests.filter(test => test.result?.state === 'success')
    const error = tests.filter(test => test.result?.state === 'failure')

    return `${this.path} tests: ${tests.length}  success: ${success.length} failures: ${error.length}`
  }

  toSummary(): string {
    const tests = this.groups.flatMap(g => g.tests)
    const success = tests.filter(test => test.result?.state === 'success')
    const error = tests.filter(test => test.result?.state === 'failure')

    const status = error.length > 0 ? ':x:' : ':white_check_mark:'

    const line: string[] = []
    line.push(`#### ${status} ${this.path}`)
    line.push('')
    line.push(`| tests | success | failures |`)
    line.push(`| ---- | ---- | ---- |`)
    line.push(`| ${tests.length}| ${success.length} | ${error.length} |`)
    line.push('')

    return line.join(`\n`)
  }

  toDetail(): string {
    const tests = this.groups.flatMap(g => g.tests)
    return tests
      .map(test => test.toDetail())
      .filter(line => line !== '')
      .join('\n')
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TestSuiteFromJSON = (json: any): TestSuite => {
  const id: number = json['suite']['id']
  const platform: string = json['suite']['platform']
  const path = json['suite']['path']
  const time: number = json['time']

  return new TestSuite({id, platform, path, time})
}
