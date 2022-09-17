const annotationLevel = ['notice', 'warning', 'failure'] as const

type AnnotationLevel = typeof annotationLevel[number]

/*
 * @see https://docs.github.com/en/rest/checks#annotations-object
 */
export class Annotation {
  // Required. The path of the file to add an annotation to. For example, assets/css/main.css.
  readonly path: string

  // Required. The start line of the annotation.
  readonly start_line: number

  // Required. The end line of the annotation.
  readonly end_line: number

  // The start column of the annotation. Annotations only support start_column and end_column on the same line. Omit this parameter if start_line and end_line have different values.
  readonly start_column?: number

  // The end column of the annotation. Annotations only support start_column and end_column on the same line. Omit this parameter if start_line and end_line have different values.
  readonly end_column?: number

  // Required. The level of the annotation. Can be one of notice, warning, or failure.
  readonly annotation_level?: AnnotationLevel

  // Required. A short description of the feedback for these lines of code. The maximum size is 64 KB.
  readonly message: string

  // The title that represents the annotation. The maximum size is 255 characters.
  readonly title?: string

  // Details about this annotation. The maximum size is 64 KB.
  readonly raw_details?: string

  readonly blob_href: string

  constructor({
    path,
    start_line,
    end_line,
    start_column,
    end_column,
    annotation_level,
    message,
    title,
    raw_details,
    blob_href
  }: {
    path: string
    start_line: number
    end_line: number
    start_column?: number
    end_column?: number
    annotation_level?: AnnotationLevel
    message: string
    title?: string
    raw_details?: string
    blob_href?: string
  }) {
    this.path = path
    this.start_line = start_line
    this.end_line = end_line
    this.start_column = start_column
    this.end_column = end_column
    this.annotation_level = annotation_level
    this.message = message
    this.title = title
    this.raw_details = raw_details
    this.blob_href =
      blob_href ??
      'https://api.github.com/repos/github/rest-api-description/git/blobs/abc'
  }
}
