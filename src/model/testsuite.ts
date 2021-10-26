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
}

export const TestSuiteFromJSON = (json: any): TestSuite => {
  const id: number = json['suite']['id']
  const platform: string = json['suite']['platform']
  const path = json['suite']['path']
  const time: number = json['time']

  return new TestSuite({id, platform, path, time})
}
