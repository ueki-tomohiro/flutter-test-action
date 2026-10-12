export interface RepositoryLinks {
  serverUrl: string
  owner: string
  repo: string
  sha: string
  runUrl?: string
  checkRunUrl?: string
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(1)} s`
  const minutes = Math.floor(seconds / 60)
  const rest = Math.round(seconds - minutes * 60)
  return `${minutes}m ${rest}s`
}

export function formatNumber(value: number): string {
  return value.toLocaleString('en-US')
}

export function formatPercent(value: number | undefined): string {
  return value === undefined ? 'n/a' : `${value.toFixed(1)}%`
}

/**
 * Escapes text for inline Markdown, including table cells.
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/[\\`*_[\]<>|~#]/gu, match => `\\${match}`)
}

/**
 * Wraps text in a fenced code block that cannot be closed by the content.
 */
export function codeBlock(text: string, language = 'text'): string {
  const longestFence = Math.max(
    2,
    ...[...text.matchAll(/`{3,}/gu)].map(match => match[0].length)
  )
  const fence = '`'.repeat(longestFence + 1)
  return `${fence}${language}\n${text}\n${fence}`
}

export function details(summary: string, body: string): string {
  return `<details><summary>${summary}</summary>\n\n${body}\n\n</details>`
}

/**
 * Truncates text to a number of lines and characters, noting what was cut.
 */
export function truncateText(
  text: string,
  maxLines: number,
  maxChars = Number.POSITIVE_INFINITY
): string {
  const lines = text.split('\n')
  let result = lines.slice(0, maxLines).join('\n')
  let truncated = lines.length > maxLines
  if (result.length > maxChars) {
    result = result.substring(0, maxChars)
    truncated = true
  }
  return truncated ? `${result}\n… (truncated)` : result
}

export function truncateChars(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  return `${text.substring(0, Math.max(0, maxChars - 15))}\n… (truncated)`
}

const frameworkFrame =
  /(^|\(|\s)(dart:|package:(flutter|flutter_test|test|test_api|test_core|stack_trace|matcher|fake_async|async)(\/|\s|$))/u

/**
 * Keeps the stack frames that point to the project, dropping the Dart SDK,
 * Flutter and the test framework.
 */
export function projectFrames(stackTrace: string): string {
  return stackTrace
    .split('\n')
    .map(line => line.trimEnd())
    .filter(
      line =>
        line.length > 0 &&
        !frameworkFrame.test(line.trim()) &&
        !line.startsWith('===== asynchronous gap') &&
        !line.includes('<asynchronous suspension>') &&
        !/^\(elided /u.test(line.trim())
    )
    .join('\n')
}

/**
 * Returns the stack frames listed in a Flutter exception report under "When
 * the exception was thrown, this was the stack:".
 */
export function exceptionStack(report: string): string {
  const frames: string[] = []
  let inStack = false
  for (const line of report.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === 'When the exception was thrown, this was the stack:') {
      inStack = true
      continue
    }
    if (!inStack) continue
    if (
      /^#\d+\s/u.test(trimmed) ||
      trimmed.startsWith('<asynchronous') ||
      /^\(elided /u.test(trimmed)
    ) {
      frames.push(trimmed)
      continue
    }
    break
  }
  return frames.join('\n')
}

const seeLogsMessage = /^Test failed\. See exception logs above\./u
const exceptionHeader = /^══╡ EXCEPTION CAUGHT BY .* ╞═+$/u
const exceptionFooter = /^═{10,}$/u

export function isSeeLogsMessage(message: string): boolean {
  return seeLogsMessage.test(message.trim())
}

/**
 * Splits the print output of a test into the exception reports written by the
 * Flutter test framework and the remaining output.
 */
export function splitExceptionReports(prints: string[]): {
  exceptions: string[]
  output: string[]
} {
  const exceptions: string[] = []
  const output: string[] = []
  let current: string[] | undefined

  for (const line of prints.join('\n').split('\n')) {
    if (exceptionHeader.test(line)) {
      current = [line]
      continue
    }
    if (current) {
      current.push(line)
      if (exceptionFooter.test(line)) {
        exceptions.push(current.join('\n'))
        current = undefined
      }
      continue
    }
    output.push(line)
  }
  if (current) exceptions.push(current.join('\n'))

  return {
    exceptions,
    output: output.join('\n').trim() ? output : []
  }
}

/**
 * Removes decoration and repeated information from an error message, keeping
 * the lines that explain the failure (Expected / Actual and so on).
 */
export function cleanErrorMessage(message: string): string {
  const result: string[] = []
  let skipping: 'stack' | 'description' | undefined

  for (const line of message.split('\n')) {
    const trimmed = line.trim()
    if (exceptionHeader.test(trimmed) || exceptionFooter.test(trimmed)) {
      continue
    }
    if (trimmed === 'When the exception was thrown, this was the stack:') {
      skipping = 'stack'
      continue
    }
    if (trimmed === 'The test description was:') {
      skipping = 'description'
      continue
    }
    if (skipping === 'stack') {
      if (/^#\d+\s/u.test(trimmed) || /^\(elided /u.test(trimmed)) continue
      if (trimmed === '' || trimmed.startsWith('<asynchronous')) continue
      skipping = undefined
    }
    if (skipping === 'description') {
      // The description is the indented test name on the next line.
      skipping = undefined
      if (line.startsWith('  ')) continue
    }
    result.push(line.trimEnd())
  }

  return result
    .join('\n')
    .replace(/\n{3,}/gu, '\n\n')
    .trim()
}

export function blobUrl(
  links: RepositoryLinks | undefined,
  path: string,
  start?: number,
  end?: number
): string | undefined {
  if (!links || !links.owner || !links.repo || !links.sha) return undefined
  const encoded = path.split('/').map(encodeURIComponent).join('/')
  let url = `${links.serverUrl}/${links.owner}/${links.repo}/blob/${links.sha}/${encoded}`
  if (start !== undefined) {
    url += `#L${start}`
    if (end !== undefined && end !== start) url += `-L${end}`
  }
  return url
}

export function commitUrl(
  links: RepositoryLinks | undefined
): string | undefined {
  if (!links || !links.owner || !links.repo || !links.sha) return undefined
  return `${links.serverUrl}/${links.owner}/${links.repo}/commit/${links.sha}`
}
