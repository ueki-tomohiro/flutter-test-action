import {Annotation} from './annotation'

export type Conclusion =
  | 'action_required'
  | 'cancelled'
  | 'failure'
  | 'neutral'
  | 'success'
  | 'skipped'
  | 'stale'
  | 'timed_out'

export class Reporter {
  readonly summary: string
  readonly detail: string
  readonly comment: string
  readonly annotations: Annotation[]
  readonly status: Conclusion

  constructor({
    summary,
    detail,
    comment,
    annotations,
    status
  }: {
    summary: string
    detail: string
    comment: string
    annotations: Annotation[]
    status: Conclusion
  }) {
    this.summary = summary
    this.detail = detail
    this.comment = comment
    this.annotations = annotations
    this.status = status
  }
}
