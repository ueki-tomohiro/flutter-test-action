import {
  ChangedLinesReport,
  CoverageReport,
  LoadFailure,
  Report,
  ReportedTest,
  TestReport
} from './build'
import {
  blobUrl,
  cleanErrorMessage,
  codeBlock,
  commitUrl,
  details,
  escapeMarkdown,
  exceptionStack,
  formatDuration,
  formatNumber,
  formatPercent,
  isSeeLogsMessage,
  projectFrames,
  splitExceptionReports,
  truncateChars,
  truncateText
} from './format'
import {LineRange} from '../diff'
import {TestCase} from '../model/test-run'

// GitHub rejects comments and check run outputs longer than 65535 characters.
// Keep a margin for the comment marker and the omission note.
export const outputLimit = 63000

const maxDetailedFailuresInComment = 10
const maxErrorsPerTest = 3
const maxMessageLines = 30
const maxMessageChars = 3000
const maxStackLines = 30
const maxOutputLines = 40
const maxChangedFilesInComment = 20
const maxLowestCoverageFiles = 20

type Section = (budget: number) => string | undefined

interface FailureOptions {
  maxDetailed: number
  fullStack: boolean
}

export function renderComment(report: Report): string {
  return assemble(
    [
      () => renderHeader(report),
      budget =>
        renderFailures(report, budget, {
          maxDetailed: maxDetailedFailuresInComment,
          fullStack: false
        }),
      budget => renderLoadFailures(report, budget),
      () => renderChangedLines(report, maxChangedFilesInComment),
      () => renderSlowest(report),
      () => renderSkipped(report)
    ],
    renderFooter(report),
    omittedNote(report)
  )
}

export function renderCheckSummary(report: Report): string {
  return assemble(
    [
      () => renderHeader(report),
      budget =>
        renderFailures(report, budget, {
          maxDetailed: Number.POSITIVE_INFINITY,
          fullStack: true
        }),
      budget => renderLoadFailures(report, budget),
      () => renderChangedLines(report, maxChangedFilesInComment)
    ],
    renderMetadata(report),
    'Some failures were omitted to fit the size limit of the check run.'
  )
}

export function renderCheckText(report: Report): string {
  return assemble(
    [
      budget => renderTestFiles(report.tests, budget),
      () => renderSlowest(report),
      () => renderSkipped(report),
      budget => renderUncoveredChangedLines(report.changedLines, budget),
      () => renderLowestCoverage(report.coverage),
      () => renderStderr(report)
    ],
    '',
    'Some sections were omitted to fit the size limit of the check run.'
  )
}

export function renderStepSummary(report: Report): string {
  return [renderCheckSummary(report), renderCheckText(report)]
    .filter(Boolean)
    .join('\n\n')
}

function assemble(
  sections: Section[],
  footer: string,
  omitted: string | undefined
): string {
  const reserved = footer.length + (omitted?.length ?? 0) + 8
  const parts: string[] = []
  let used = 0
  let wasOmitted = false

  for (const section of sections) {
    const budget = outputLimit - reserved - used
    const text = section(budget)
    if (!text) continue
    if (text.length > budget) {
      wasOmitted = true
      continue
    }
    parts.push(text)
    used += text.length + 2
  }

  if (wasOmitted && omitted) parts.push(omitted)
  if (footer) parts.push(footer)
  return parts.join('\n\n')
}

function renderHeader(report: Report): string {
  const icon = report.conclusion === 'success' ? '✅' : '❌'
  const lines = [`## ${icon} ${escapeMarkdown(report.title)}`, '']

  if (report.tests) {
    lines.push(testCounts(report.tests))
  }
  const coverage = coverageCounts(report.coverage, report.changedLines)
  if (coverage) {
    if (report.tests) lines[lines.length - 1] += '  '
    lines.push(coverage)
  }

  if (report.problems.length > 0) {
    lines.push('', '> [!CAUTION]')
    for (const problem of report.problems) {
      lines.push(`> ${problem}`)
    }
  }

  return lines.join('\n')
}

function testCounts(tests: TestReport): string {
  const parts: string[] = []
  if (tests.failed > 0) parts.push(`**${formatNumber(tests.failed)} failed**`)
  if (tests.loadFailures.length > 0) {
    parts.push(`**${formatNumber(tests.loadFailures.length)} failed to load**`)
  }
  parts.push(`${formatNumber(tests.passed)} passed`)
  if (tests.skipped > 0) parts.push(`${formatNumber(tests.skipped)} skipped`)
  parts.push(`⏱ ${formatDuration(tests.durationMs)}`)
  return parts.join(' · ')
}

function coverageCounts(
  coverage: CoverageReport | undefined,
  changedLines: ChangedLinesReport | undefined
): string | undefined {
  const parts: string[] = []
  if (coverage) {
    let text = `Coverage **${formatPercent(coverage.lines.percent)}**`
    if (coverage.threshold !== undefined) {
      text += ` (threshold ${coverage.threshold}%)`
    }
    parts.push(text)
    if (coverage.functions.found > 0) {
      parts.push(`Functions ${formatPercent(coverage.functions.percent)}`)
    }
    if (coverage.branches.found > 0) {
      parts.push(`Branches ${formatPercent(coverage.branches.percent)}`)
    }
  }
  if (changedLines && changedLines.data.total > 0) {
    let text = `Changed lines **${formatPercent(changedLines.percent)}** (${formatNumber(changedLines.data.covered)}/${formatNumber(changedLines.data.total)})`
    if (changedLines.threshold !== undefined) {
      text += ` (threshold ${changedLines.threshold}%)`
    }
    parts.push(text)
  }
  return parts.length > 0 ? parts.join(' · ') : undefined
}

function renderFailures(
  report: Report,
  budget: number,
  options: FailureOptions
): string | undefined {
  const failures = report.tests?.failures ?? []
  if (failures.length === 0) return undefined

  const parts = [`### ❌ Failed tests (${formatNumber(failures.length)})`]
  let used = parts[0].length
  let index = 0

  for (; index < failures.length && index < options.maxDetailed; index++) {
    const text = renderFailure(failures[index], report, options)
    // Leave room for listing the remaining failures by name.
    if (used + text.length + 2 > budget - 2000) break
    parts.push(text)
    used += text.length + 2
  }

  const rest = failures.slice(index)
  if (rest.length > 0) {
    const items: string[] = []
    for (const failure of rest) {
      const item = `- ❌ **${escapeMarkdown(failure.name)}** — ${location(failure, report)}`
      if (used + item.length + 100 > budget) break
      items.push(item)
      used += item.length + 1
    }
    if (items.length < rest.length) {
      items.push(`- …and ${formatNumber(rest.length - items.length)} more`)
    }
    parts.push(
      index > 0
        ? `Other failed tests:\n\n${items.join('\n')}`
        : items.join('\n')
    )
  }

  return parts.join('\n\n')
}

function renderFailure(
  failure: ReportedTest,
  report: Report,
  options: FailureOptions
): string {
  const lines = [
    `#### ${escapeMarkdown(failure.name)}`,
    '',
    `${location(failure, report)} · ${formatDuration(failure.test.durationMs)}`
  ]

  const {messages, output} = failureDetails(failure.test)
  for (const message of messages.slice(0, maxErrorsPerTest)) {
    lines.push(
      '',
      codeBlock(truncateText(message.text, maxMessageLines, maxMessageChars))
    )
    const stack = options.fullStack
      ? message.stackTrace.trim()
      : projectFrames(message.stackTrace)
    if (stack) {
      lines.push(
        '',
        details(
          'Stack trace',
          codeBlock(
            truncateText(stack, options.fullStack ? 100 : maxStackLines)
          )
        )
      )
    }
  }
  if (messages.length > maxErrorsPerTest) {
    lines.push('', `…and ${messages.length - maxErrorsPerTest} more errors`)
  }

  if (output.length > 0) {
    lines.push(
      '',
      details(
        `Output (${formatNumber(output.length)} lines)`,
        codeBlock(truncateText(output.join('\n'), maxOutputLines, 4000))
      )
    )
  }

  return lines.join('\n')
}

/**
 * Picks the messages that explain a failure. For widget tests, Flutter prints
 * the exception and reports only "Test failed. See exception logs above.", so
 * the printed exception is used instead.
 */
export function failureDetails(test: TestCase): {
  messages: {text: string; stackTrace: string}[]
  output: string[]
} {
  const {exceptions, output} = splitExceptionReports(test.prints)
  const errors = test.errors.filter(e => !isSeeLogsMessage(e.message))
  const stackTrace = test.errors[0]?.stackTrace ?? ''

  const messages =
    errors.length > 0
      ? errors.map(e => ({
          text: cleanErrorMessage(e.message),
          stackTrace: e.stackTrace
        }))
      : exceptions.map(text => ({
          text: cleanErrorMessage(text),
          stackTrace: exceptionStack(text) || stackTrace
        }))

  if (messages.length === 0 && test.errors.length > 0) {
    messages.push({
      text: cleanErrorMessage(test.errors[0].message),
      stackTrace
    })
  }

  return {
    messages,
    output:
      errors.length > 0 && test.prints.length > 0
        ? test.prints.join('\n').split('\n')
        : output
  }
}

function renderLoadFailures(
  report: Report,
  budget: number
): string | undefined {
  const failures = report.tests?.loadFailures ?? []
  if (failures.length === 0) return undefined

  const parts = [`### 💥 Failed to load (${formatNumber(failures.length)})`]
  let used = parts[0].length
  for (const failure of failures) {
    const text = renderLoadFailure(failure, report)
    if (used + text.length + 2 > budget) {
      parts.push(`…and ${failures.length - parts.length + 1} more`)
      break
    }
    parts.push(text)
    used += text.length + 2
  }
  return parts.join('\n\n')
}

function renderLoadFailure(failure: LoadFailure, report: Report): string {
  const url = failure.path ? blobUrl(report.links, failure.path) : undefined
  const name = `\`${failure.displayPath}\``
  const message = failure.errors
    .map(e => cleanErrorMessage(e.message))
    .join('\n\n')
  return [
    `#### ${url ? `[${name}](${url})` : name}`,
    '',
    codeBlock(truncateText(message, maxMessageLines, maxMessageChars))
  ].join('\n')
}

function renderChangedLines(
  report: Report,
  maxFiles: number
): string | undefined {
  const changed = report.changedLines?.data
  if (!changed) return undefined

  const withGaps = changed.files
    .filter(file => file.uncovered.length > 0)
    .sort((a, b) => b.total - b.covered - (a.total - a.covered))
  if (withGaps.length === 0 && changed.missingFiles.length === 0) {
    return undefined
  }

  const lines = ['### 📉 Changed lines without coverage']
  if (withGaps.length > 0) {
    lines.push(
      '',
      '| File | Covered | Uncovered lines |',
      '| ---- | ----: | ---- |'
    )
    for (const file of withGaps.slice(0, maxFiles)) {
      lines.push(
        `| ${fileLink(file.path, report)} | ${file.covered}/${file.total} (${formatPercent(
          (file.covered / file.total) * 100
        )}) | ${ranges(file.path, file.uncovered, report, 5)} |`
      )
    }
    if (withGaps.length > maxFiles) {
      lines.push('', `…and ${withGaps.length - maxFiles} more files`)
    }
  }
  const fullyCovered = changed.files.length - withGaps.length
  if (fullyCovered > 0) {
    lines.push(
      '',
      `${formatNumber(fullyCovered)} other changed ${fullyCovered === 1 ? 'file is' : 'files are'} fully covered.`
    )
  }
  if (changed.missingFiles.length > 0) {
    lines.push(
      '',
      `**Not loaded by any test** (these files are missing from the coverage report):`,
      '',
      ...changed.missingFiles
        .slice(0, maxFiles)
        .map(file => `- ${fileLink(file, report)}`)
    )
    if (changed.missingFiles.length > maxFiles) {
      lines.push(`- …and ${changed.missingFiles.length - maxFiles} more`)
    }
  }
  return lines.join('\n')
}

function renderSlowest(report: Report): string | undefined {
  const slowest = report.tests?.slowest ?? []
  if (slowest.length === 0) return undefined

  const rows = slowest.map(
    test =>
      `| ${escapeMarkdown(test.name)} | ${location(test, report)} | ${formatDuration(test.test.durationMs)} |`
  )
  return details(
    `🐢 Slowest tests (${slowest.length})`,
    ['| Test | File | Time |', '| ---- | ---- | ----: |', ...rows].join('\n')
  )
}

function renderSkipped(report: Report): string | undefined {
  const skipped = report.tests?.skippedTests ?? []
  if (skipped.length === 0) return undefined

  const items = skipped.slice(0, 50).map(test => {
    const reason = test.test.skipReason
      ? ` — ${escapeMarkdown(test.test.skipReason)}`
      : ''
    return `- ${escapeMarkdown(test.name)}${reason} (${location(test, report)})`
  })
  if (skipped.length > 50) items.push(`- …and ${skipped.length - 50} more`)
  return details(`⏭ Skipped tests (${skipped.length})`, items.join('\n'))
}

function renderTestFiles(
  tests: TestReport | undefined,
  budget: number
): string | undefined {
  if (!tests || tests.files.length === 0) return undefined

  const lines = [
    '### Test files',
    '',
    '| File | Tests | ✅ | ❌ | ⏭ | Time |',
    '| ---- | ----: | ----: | ----: | ----: | ----: |'
  ]
  let used = lines.join('\n').length
  let shown = 0
  for (const file of tests.files) {
    const row = `| ${file.path ? `\`${file.path}\`` : `\`${file.displayPath}\``} | ${file.total} | ${file.passed} | ${file.failed} | ${file.skipped} | ${formatDuration(file.durationMs)} |`
    if (used + row.length + 200 > budget) break
    lines.push(row)
    used += row.length + 1
    shown++
  }
  if (shown < tests.files.length) {
    lines.push('', `…and ${tests.files.length - shown} more files`)
  }
  return lines.join('\n')
}

function renderUncoveredChangedLines(
  changedLines: ChangedLinesReport | undefined,
  budget: number
): string | undefined {
  const files = changedLines?.data.files.filter(f => f.uncovered.length > 0)
  if (!files || files.length === 0) return undefined

  const lines = ['### Uncovered changed lines', '']
  let used = lines.join('\n').length
  for (const file of files) {
    const item = `- \`${file.path}\`: ${file.uncovered.map(formatRange).join(', ')}`
    if (used + item.length + 100 > budget) {
      lines.push('- …')
      break
    }
    lines.push(item)
    used += item.length + 1
  }
  return lines.join('\n')
}

function renderLowestCoverage(
  coverage: CoverageReport | undefined
): string | undefined {
  const files = coverage?.files.filter(file => file.hit < file.found) ?? []
  if (files.length === 0) return undefined

  const rows = files
    .slice(0, maxLowestCoverageFiles)
    .map(
      file =>
        `| \`${file.path ?? file.displayPath}\` | ${file.hit}/${file.found} | ${formatPercent(file.percent)} |`
    )
  return [
    `### Lowest coverage files`,
    '',
    '| File | Lines | Coverage |',
    '| ---- | ----: | ----: |',
    ...rows
  ].join('\n')
}

function renderStderr(report: Report): string | undefined {
  if (report.stderrTail.length === 0) return undefined
  if (report.exitCode === undefined || report.exitCode === 0) return undefined
  return [
    `### stderr (last ${report.stderrTail.length} lines)`,
    '',
    codeBlock(truncateChars(report.stderrTail.join('\n'), 8000))
  ].join('\n')
}

function renderFooter(report: Report): string {
  const links: string[] = []
  if (report.links?.checkRunUrl) {
    links.push(`[Full report](${report.links.checkRunUrl})`)
  }
  const commit = commitUrl(report.links)
  if (commit && report.links) {
    links.push(`Commit [\`${report.links.sha.substring(0, 7)}\`](${commit})`)
  }
  if (report.links?.runUrl) {
    links.push(`[Workflow run](${report.links.runUrl})`)
  }
  return links.length > 0 ? `<sub>${links.join(' · ')}</sub>` : ''
}

function omittedNote(report: Report): string {
  const url = report.links?.checkRunUrl
  return url
    ? `Some sections were omitted to fit the size limit. See the [full report](${url}).`
    : 'Some sections were omitted to fit the size limit. See the check run for the full report.'
}

function renderMetadata(report: Report): string {
  const data = {
    version: 1,
    conclusion: report.conclusion,
    tests: report.tests && {
      total: report.tests.total,
      passed: report.tests.passed,
      failed: report.tests.failed,
      skipped: report.tests.skipped,
      loadFailures: report.tests.loadFailures.length,
      durationMs: report.tests.durationMs
    },
    coverage: report.coverage && {
      hit: report.coverage.lines.hit,
      found: report.coverage.lines.found
    },
    changedLines: report.changedLines && {
      covered: report.changedLines.data.covered,
      total: report.changedLines.data.total
    }
  }
  return `<!-- flutter-test-action-data ${JSON.stringify(data)} -->`
}

function location(test: ReportedTest, report: Report): string {
  const label = `\`${test.displayPath}${test.line ? `:${test.line}` : ''}\``
  const url = test.path
    ? blobUrl(report.links, test.path, test.line)
    : undefined
  return url ? `[${label}](${url})` : label
}

function fileLink(path: string, report: Report): string {
  const url = blobUrl(report.links, path)
  return url ? `[\`${path}\`](${url})` : `\`${path}\``
}

function ranges(
  path: string,
  uncovered: LineRange[],
  report: Report,
  max: number
): string {
  const items = uncovered.slice(0, max).map(range => {
    const url = blobUrl(report.links, path, range.start, range.end)
    return url ? `[${formatRange(range)}](${url})` : formatRange(range)
  })
  if (uncovered.length > max) items.push(`+${uncovered.length - max} more`)
  return items.join(', ')
}

function formatRange(range: LineRange): string {
  return range.start === range.end
    ? `L${range.start}`
    : `L${range.start}-${range.end}`
}
