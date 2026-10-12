import {ChangedFile, parseAddedLines} from './diff'
import {Annotation} from './report/annotations'
import {Conclusion} from './report/build'
import {RepositoryLinks} from './report/format'

export type GitHubModule = typeof import('@actions/github', {
  with: {'resolution-mode': 'import'}
})
export type Octokit = ReturnType<GitHubModule['getOctokit']>

export interface RunContext {
  owner: string
  repo: string
  sha: string
  pullNumber?: number
  links: RepositoryLinks
}

// GitHub accepts up to 50 annotations per request.
const annotationsPerRequest = 50

export function readContext(github: GitHubModule): RunContext {
  const {context} = github
  const {owner, repo} = context.repo
  const pr = context.payload.pull_request
  const sha: string = pr?.head?.sha ?? context.sha
  const serverUrl = context.serverUrl || 'https://github.com'

  return {
    owner,
    repo,
    sha,
    pullNumber: pr?.number,
    links: {
      serverUrl,
      owner,
      repo,
      sha,
      runUrl: context.runId
        ? `${serverUrl}/${owner}/${repo}/actions/runs/${context.runId}`
        : undefined
    }
  }
}

export function commentMarker(title: string): string {
  return `<!-- flutter-test-action:${title.replace(/-->/gu, '')} -->`
}

export async function fetchChangedFiles(
  octokit: Octokit,
  context: RunContext
): Promise<ChangedFile[]> {
  if (!context.pullNumber) return []

  const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
    owner: context.owner,
    repo: context.repo,
    pull_number: context.pullNumber,
    per_page: 100
  })

  return files
    .filter(file => file.status !== 'removed' && file.patch)
    .map(file => ({
      path: file.filename,
      addedLines: parseAddedLines(file.patch ?? '')
    }))
}

export async function createCheckRun(
  octokit: Octokit,
  context: RunContext,
  {
    name,
    conclusion,
    title,
    summary,
    text,
    annotations
  }: {
    name: string
    conclusion: Conclusion
    title: string
    summary: string
    text: string
    annotations: Annotation[]
  }
): Promise<string | undefined> {
  const chunks: Annotation[][] = []
  for (let i = 0; i < annotations.length; i += annotationsPerRequest) {
    chunks.push(annotations.slice(i, i + annotationsPerRequest))
  }
  const output = {title, summary, text}

  const {data} = await octokit.rest.checks.create({
    owner: context.owner,
    repo: context.repo,
    name,
    head_sha: context.sha,
    status: 'completed',
    conclusion,
    output: {...output, annotations: chunks[0] ?? []}
  })

  for (const chunk of chunks.slice(1)) {
    await octokit.rest.checks.update({
      owner: context.owner,
      repo: context.repo,
      check_run_id: data.id,
      output: {...output, annotations: chunk}
    })
  }

  return data.html_url ?? undefined
}

/**
 * Creates the pull request comment for this title, or updates the one created
 * by a previous run.
 */
export async function upsertComment(
  octokit: Octokit,
  context: RunContext,
  title: string,
  body: string
): Promise<'created' | 'updated' | 'skipped'> {
  if (!context.pullNumber) return 'skipped'

  const marker = commentMarker(title)
  const fullBody = `${marker}\n${body}`
  const comments = await octokit.paginate(octokit.rest.issues.listComments, {
    owner: context.owner,
    repo: context.repo,
    issue_number: context.pullNumber,
    per_page: 100
  })
  const existing = comments.find(
    comment => comment.body?.split('\n', 1)[0] === marker
  )

  if (existing) {
    await octokit.rest.issues.updateComment({
      owner: context.owner,
      repo: context.repo,
      comment_id: existing.id,
      body: fullBody
    })
    return 'updated'
  }

  await octokit.rest.issues.createComment({
    owner: context.owner,
    repo: context.repo,
    issue_number: context.pullNumber,
    body: fullBody
  })
  return 'created'
}
