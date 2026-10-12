import {Report} from './build'
import {failureDetails} from './markdown'
import {cleanErrorMessage, truncateChars} from './format'

/**
 * @see https://docs.github.com/en/rest/checks/runs#annotations-object
 */
export interface Annotation {
  path: string
  start_line: number
  end_line: number
  annotation_level: 'notice' | 'warning' | 'failure'
  message: string
  title?: string
  raw_details?: string
}

const maxMessageChars = 4000
const maxDetailsChars = 20000

export function buildAnnotations(
  report: Report,
  {annotateUncoveredLines}: {annotateUncoveredLines: boolean}
): Annotation[] {
  const annotations: Annotation[] = []

  for (const failure of report.tests?.failures ?? []) {
    if (!failure.path) continue
    const {messages, output} = failureDetails(failure.test)
    const line = failure.line ?? 1
    const rawDetails = [
      messages.map(m => m.stackTrace.trim()).find(Boolean),
      output.length > 0 ? `Output:\n${output.join('\n')}` : undefined
    ]
      .filter(Boolean)
      .join('\n\n')

    annotations.push({
      path: failure.path,
      start_line: line,
      end_line: line,
      annotation_level: 'failure',
      title: truncateChars(failure.name, 255),
      message: truncateChars(
        messages.map(m => m.text).join('\n\n') || 'Test failed.',
        maxMessageChars
      ),
      raw_details: rawDetails
        ? truncateChars(rawDetails, maxDetailsChars)
        : undefined
    })
  }

  for (const failure of report.tests?.loadFailures ?? []) {
    if (!failure.path) continue
    annotations.push({
      path: failure.path,
      start_line: 1,
      end_line: 1,
      annotation_level: 'failure',
      title: 'Failed to load the test file',
      message: truncateChars(
        failure.errors.map(e => cleanErrorMessage(e.message)).join('\n\n'),
        maxMessageChars
      )
    })
  }

  if (annotateUncoveredLines) {
    for (const file of report.changedLines?.data.files ?? []) {
      for (const range of file.uncovered) {
        annotations.push({
          path: file.path,
          start_line: range.start,
          end_line: range.end,
          annotation_level: 'notice',
          title: 'Not covered by tests',
          message:
            range.start === range.end
              ? `Changed line ${range.start} is not covered by tests.`
              : `Changed lines ${range.start}-${range.end} are not covered by tests.`
        })
      }
    }
  }

  return annotations
}
