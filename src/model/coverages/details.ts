import {exists} from '../runtime'

export class Details {
  readonly line: number
  readonly hit?: number
  readonly block?: number
  readonly branch?: number
  readonly taken?: number

  constructor({
    line,
    hit,
    block,
    branch,
    taken
  }: {
    line: number
    hit: number
    block: number
    branch: number
    taken: number
  }) {
    this.line = line
    this.hit = hit
    this.block = block
    this.branch = branch
    this.taken = taken
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DetailsFromJSON = (json: any): Details => {
  if (json === undefined || json === null) {
    return json
  }

  return new Details({
    line: exists(json, 'line') ? json['line'] : 0,
    hit: json['hit'],
    block: json['block'],
    branch: json['branch'],
    taken: json['taken']
  })
}
