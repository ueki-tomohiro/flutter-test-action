import {Details} from '..'
import {exists} from '../runtime'

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
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const FunctionsFromJSON = (json: any): Functions => {
  if (json === undefined || json === null) {
    return json
  }

  return new Functions({
    hit: exists(json, 'hit') ? json['hit'] : 0,
    found: exists(json, 'found') ? json['found'] : 0,
    details: json['details']
  })
}
