import {Functions, FunctionsFromJSON} from '..'

export class Coverage {
  readonly title: string
  readonly file: string
  readonly branches: Functions
  readonly functions: Functions
  readonly lines: Functions

  constructor({
    title,
    file,
    branches,
    functions,
    lines
  }: {
    title: string
    file: string
    branches: Functions
    functions: Functions
    lines: Functions
  }) {
    this.title = title
    this.file = file
    this.branches = branches
    this.functions = functions
    this.lines = lines
  }

  toSummary(): string {
    const state =
      this.lines.found > 0
        ? Math.round((this.lines.hit / this.lines.found) * 1000) / 10
        : 0
    const icon = state > 80 ? ':white_check_mark:' : ':x:'

    const line: string[] = []
    line.push(`#### ${icon} ${this.file}`)
    line.push('')
    line.push(`| Hit | Found | State |`)
    line.push(`| ---- | ---- | ---- |`)
    line.push(`| ${this.lines.hit}| ${this.lines.found} | ${state} |`)
    line.push('')

    return line.join(`\n`)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CoverageFromJSON = (json: any): Coverage => {
  if (json === undefined || json === null) {
    return json
  }
  return new Coverage({
    title: json['title'],
    file: json['file'],
    branches: FunctionsFromJSON(json['branches']),
    functions: FunctionsFromJSON(json['functions']),
    lines: FunctionsFromJSON(json['lines'])
  })
}
