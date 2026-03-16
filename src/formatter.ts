import {Reporter} from './model/reporter'
import {promises} from 'fs'

type ExportReport = (args: {
  report?: Reporter
  coverage?: Reporter
}) => Promise<void>

const charactersLimit = 65535
const stepSummaryPath = process.env['GITHUB_STEP_SUMMARY']
const commentMarker = '<!-- flutter-test-action-comment -->'

function combineConclusion(
  report?: Reporter,
  coverage?: Reporter
): 'success' | 'failure' {
  const conclusions = [report?.status, coverage?.status].filter(
    (status): status is Reporter['status'] => status !== undefined
  )

  if (conclusions.length === 0) {
    return 'failure'
  }

  return conclusions.every(status => status === 'success')
    ? 'success'
    : 'failure'
}

async function appendStepSummary(
  title: string,
  summary: string,
  detail: string
): Promise<void> {
  if (!stepSummaryPath) {
    return
  }

  const content = [`## ${title}`, '', summary]
  if (detail) {
    content.push('', detail)
  }
  content.push('', '')

  await promises.appendFile(stepSummaryPath, content.join('\n'), 'utf8')
}

function buildCommentBody(comment: string): string {
  return `${commentMarker}\n${comment}`
}

/**
 * Escape emoji sequences.
 */
export function escapeEmoji(input: string): string {
  const regex =
    /[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}\u{1f1e6}-\u{1f1ff}\u{1f191}-\u{1f251}\u{1f004}\u{1f0cf}\u{1f170}-\u{1f171}\u{1f17e}-\u{1f17f}\u{1f18e}\u{3030}\u{2b50}\u{2b55}\u{2934}-\u{2935}\u{2b05}-\u{2b07}\u{2b1b}-\u{2b1c}\u{3297}\u{3299}\u{303d}\u{00a9}\u{00ae}\u{2122}\u{23f3}\u{24c2}\u{23e9}-\u{23ef}\u{25b6}\u{23f8}-\u{23fa}]/gu
  return input.replace(regex, ``) // replace emoji with empty string (\\u${(match.codePointAt(0) || "").toString(16)})
}

export const exportReport: ExportReport = async ({report, coverage}) => {
  const [core, github] = await Promise.all([
    import('@actions/core'),
    import('@actions/github')
  ])
  const token = core.getInput('token')
  const conclusion = combineConclusion(report, coverage)

  let title = core.getInput('title')
  if (title.length > charactersLimit) {
    core.error(
      `The 'title' will be truncated because the character limit (${charactersLimit}) exceeded.`
    )
    title = title.substring(0, charactersLimit)
  }

  let summary = report?.summary ?? ''
  summary += coverage?.summary ? `\n${coverage.summary}` : ''
  if (summary.length > charactersLimit) {
    core.error(
      `The 'summary' will be truncated because the character limit (${charactersLimit}) exceeded.`
    )
    summary = summary.substring(0, charactersLimit)
  }

  let reportDetail = report?.detail ?? ''
  reportDetail += coverage?.detail ? `\n${coverage.detail}` : ''
  if (reportDetail.length > charactersLimit) {
    core.error(
      `The 'text' will be truncated because the character limit (${charactersLimit}) exceeded.`
    )
    reportDetail = reportDetail.substring(0, charactersLimit)
  }

  const annotations = report?.annotations ?? []
  if (annotations.length > 50) {
    core.error('Annotations that exceed the limit (50) will be truncated.')
  }

  let comment = report?.comment ?? ''
  comment += coverage?.comment ? `\n${coverage.comment}` : ''

  core.setOutput('conclusion', conclusion)
  for (const [name, value] of Object.entries({
    ...(report?.outputs ?? {}),
    ...(coverage?.outputs ?? {})
  })) {
    core.setOutput(name, value)
  }

  try {
    await appendStepSummary(title, summary, reportDetail)
  } catch (error) {
    core.error(`Failed to write step summary: ${(error as Error).message}`)
  }

  if (!token) {
    core.info(
      'Skipping GitHub check run and pull request comment because no token was provided.'
    )
    return
  }

  try {
    const octokit = github.getOctokit(token)

    const owner = github.context.repo.owner
    const repo = github.context.repo.repo

    const pr = github.context.payload.pull_request
    const sha = (pr && pr.head.sha) || github.context.sha
    const issueNumber = pr?.number || github.context.issue.number

    if (comment && issueNumber) {
      const body = buildCommentBody(comment)
      const comments = await octokit.paginate(
        octokit.rest.issues.listComments,
        {
          owner,
          repo,
          issue_number: issueNumber
        }
      )
      const existingComment = comments.find(
        current =>
          typeof current.body === 'string' &&
          current.body.includes(commentMarker)
      )

      if (existingComment) {
        await octokit.rest.issues.updateComment({
          owner,
          repo,
          comment_id: existingComment.id,
          body
        })
      } else {
        await octokit.rest.issues.createComment({
          owner,
          repo,
          issue_number: issueNumber,
          body
        })
      }
    } else if (comment) {
      core.info(
        'Skipping pull request comment because the workflow is not running for a pull request.'
      )
    }

    await octokit.rest.checks.create({
      owner,
      repo,
      name: title,
      head_sha: sha,
      status: 'completed',
      conclusion,
      output: {
        title,
        summary,
        text: reportDetail,
        annotations: annotations.slice(0, 50)
      }
    })
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`${error.name}:${error.message}\n\n${error.stack}`)
    }
  }
}
