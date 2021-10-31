import {TestStart} from './teststart'

export class TestGroup {
  readonly id: number
  readonly name: string
  readonly suiteId: number
  readonly testCount: number
  readonly time: number
  readonly tests: TestStart[]

  constructor({
    id,
    name,
    suiteId,
    testCount,
    time
  }: {
    id: number
    name: string
    suiteId: number
    testCount: number
    time: number
  }) {
    this.id = id
    this.name = name
    this.suiteId = suiteId
    this.testCount = testCount
    this.time = time
    this.tests = []
  }

  toUnit(): string {
    const lines: string[] = []

    for (const model of this.tests) {
      lines.push(model.toUnit())
    }

    return lines.join('\n')
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TestGroupFromJSON = (json: any): TestGroup => {
  const id: number = json['group']['id']
  const name: string = json['group']['name']
  const suiteId: number = json['group']['suiteID']
  const testCount: number = json['group']['testCount']
  const time: number = json['time']

  return new TestGroup({id, name, suiteId, testCount, time})
}
