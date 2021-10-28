import {Annotation} from './annotation'

const conclusion = [
  'action_required',
  'cancelled',
  'failure',
  'neutral',
  'success',
  'skipped',
  'stale',
  'timed_out'
] as const

export type Conclusion = typeof conclusion[number]

export class Reporter {
  readonly summary: string
  readonly detail: string
  readonly annotations: Annotation[]
  readonly status: Conclusion

  constructor({
    summary,
    detail,
    annotations,
    status
  }: {
    summary: string
    detail: string
    annotations: Annotation[]
    status: Conclusion
  }) {
    this.summary = summary
    this.detail = detail
    this.annotations = annotations
    this.status = status
  }
}
