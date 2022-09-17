import {Annotation} from '../annotation'
import {TestDone} from './testdone'

export class TestStart {
  readonly id: number
  readonly suiteId: number
  readonly groupIds: number[]
  readonly name: string
  readonly url: string
  readonly time: string
  readonly skip: boolean
  readonly line: number
  readonly column: number
  result?: TestDone

  constructor({
    id,
    suiteId,
    groupIds,
    name,
    url,
    skip,
    line,
    column,
    time
  }: {
    id: number
    suiteId: number
    groupIds: number[]
    name: string
    url: string
    skip: boolean
    line: number
    column: number
    time: string
  }) {
    this.id = id
    this.suiteId = suiteId
    this.groupIds = groupIds ?? []
    this.name = name
    this.url = url
    this.skip = skip
    this.line = line
    this.column = column
    this.time = time
  }

  get stateIcon(): string {
    switch (this.result?.state) {
      case 'success':
        return ':white_check_mark:'
      case 'skipped':
        return ':wavy_dash:'
    }

    return ':x:'
  }

  toAnnotation(): Annotation | undefined {
    if (!this.result) return undefined
    if (this.result.state === 'success') return undefined

    return new Annotation({
      path: this.url,
      start_line: this.line,
      end_line: this.line,
      annotation_level: 'failure',
      message: this.result.error ?? '',
      title: this.name,
      raw_details: this.result.stackTrace
    })
  }

  toUnit(): string {
    const lines: string[] = [
      `<testcase classname="${this.name}" time="${this.time}">`
    ]

    if (this.result) {
      if (this.result.state === 'failure') {
        lines.push(
          `<failure type="failure" message="${this.escapeHtml(
            this.result.error ?? ''
          )}">${this.escapeHtml(this.result.stackTrace ?? '')}</failure>`
        )
      }
    }

    lines.push('</testcase>')
    return lines.join('\n')
  }

  toDetail(): string {
    if (this.result) {
      return `| ${this.name} | ${this.stateIcon} | ${this.result.time} |`
    }
    return ''
  }

  escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TestStartFromJSON = (json: any): TestStart => {
  const id: number = json['test']['id']
  const suiteId: number = json['test']['suiteID']
  const groupIds: number[] = json['test']['groupIDs']
  const name: string = json['test']['name']
  const url: string = json['test']['url']
  const skip: boolean = json['test']['metadata']['skip']
  const line: number = json['test']['line']
  const column: number = json['test']['column']
  const time: string = json['time']

  return new TestStart({
    id,
    suiteId,
    groupIds,
    name,
    url,
    skip,
    line,
    column,
    time
  })
}
