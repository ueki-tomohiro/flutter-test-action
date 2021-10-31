import {Details, DetailsFromJSON} from './details'
import {exists} from './runtime'

export class Functions {
  readonly hit: number
  readonly found: number
  readonly details: Details[]

  constructor({
    hit,
    found,
    details
  }: {
    hit: number
    found: number
    details: Details[]
  }) {
    this.hit = hit
    this.found = found
    this.details = details
  }

  toSummary(path: String): string {
    const line: string[] = []
    const status =
      this.found > 0
        ? this.hit / this.found > 0.8
          ? ':x:'
          : ':white_check_mark:'
        : ':white_check_mark:'

    line.push(`#### ${status} ${path}`)
    line.push('')
    line.push(`| hit | found |`)
    line.push(`| ---- | ---- |`)
    line.push(`| ${this.hit}| ${this.found}|`)
    line.push('')

    return line.join(`\n`)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const FunctionsFromJSON = (json: any): Functions => {
  if (json === undefined || json === null) {
    return json
  }
  return new Functions({
    hit: exists(json, 'hit') ? json['hit'] : '',
    found: exists(json, 'found') ? json['found'] : '',
    details: exists(json, 'details') ? json['details'].map(DetailsFromJSON) : []
  })
}
