import {Functions, FunctionsFromJSON} from './functions'
import {exists} from './runtime'

export class Coverage {
  readonly title: string
  readonly file: string
  readonly lines: Functions
  readonly branches: Functions
  readonly functions: Functions

  constructor({
    title,
    file,
    lines,
    branches,
    functions
  }: {
    title: string
    file: string
    lines: Functions
    branches: Functions
    functions: Functions
  }) {
    this.title = title
    this.file = file
    this.lines = lines
    this.branches = branches
    this.functions = functions
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CoverageFromJSON = (json: any): Coverage => {
  if (json === undefined || json === null) {
    return json
  }
  return new Coverage({
    title: exists(json, 'title') ? json['title'] : '',
    file: exists(json, 'file') ? json['file'] : '',
    lines: FunctionsFromJSON(json['lines']),
    functions: FunctionsFromJSON(json['functions']),
    branches: FunctionsFromJSON(json['branches'])
  })
}
