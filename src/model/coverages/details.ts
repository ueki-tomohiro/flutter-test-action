import {exists} from './runtime'

export class Details {
  readonly name: string
  readonly line: number
  readonly hit?: number
  readonly block?: number
  readonly branch?: number

  constructor({
    name,
    line,
    hit,
    block,
    branch
  }: {
    name: string
    line: number
    hit?: number
    block?: number
    branch?: number
  }) {
    this.name = name
    this.line = line
    this.hit = hit
    this.block = block
    this.branch = branch
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DetailsFromJSON = (json: any): Details => {
  if (json === undefined || json === null) {
    return json
  }
  return new Details({
    name: exists(json, 'name') ? json['name'] : '',
    line: exists(json, 'line') ? json['line'] : 0,
    hit: exists(json, 'hit') ? json['hit'] : undefined,
    block: exists(json, 'block') ? json['block'] : undefined,
    branch: exists(json, 'branch') ? json['branch'] : undefined
  })
}
