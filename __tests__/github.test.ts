import {describe, expect, test, vi} from 'vitest'
import {
  Octokit,
  RunContext,
  commentMarker,
  createCheckRun,
  fetchChangedFiles,
  upsertComment
} from '../src/github'
import {Annotation} from '../src/report/annotations'

const context: RunContext = {
  owner: 'octo',
  repo: 'app',
  sha: 'abc',
  pullNumber: 7,
  links: {
    serverUrl: 'https://github.com',
    owner: 'octo',
    repo: 'app',
    sha: 'abc'
  }
}

function createOctokit(comments: {id: number; body?: string}[] = []) {
  const octokit = {
    paginate: vi.fn(async (method: unknown) =>
      method === octokit.rest.issues.listComments ? comments : []
    ),
    rest: {
      issues: {
        listComments: vi.fn(),
        createComment: vi.fn(),
        updateComment: vi.fn()
      },
      pulls: {listFiles: vi.fn()},
      checks: {
        create: vi.fn(async () => ({
          data: {id: 99, html_url: 'https://github.com/octo/app/runs/99'}
        })),
        update: vi.fn()
      }
    }
  }
  return octokit
}

function annotation(line: number): Annotation {
  return {
    path: 'a.dart',
    start_line: line,
    end_line: line,
    annotation_level: 'failure',
    message: 'x'
  }
}

describe('upsertComment', () => {
  test('updates the comment with the same title only', async () => {
    const octokit = createOctokit([
      {id: 1, body: `${commentMarker('Catalog test results')}\nold`},
      {id: 2, body: `${commentMarker('Unit test results')}\nold`},
      {id: 3, body: 'mentions <!-- flutter-test-action:Unit test results -->'}
    ])

    const result = await upsertComment(
      octokit as unknown as Octokit,
      context,
      'Unit test results',
      'new'
    )

    expect(result).toBe('updated')
    expect(octokit.rest.issues.updateComment).toHaveBeenCalledWith({
      owner: 'octo',
      repo: 'app',
      comment_id: 2,
      body: '<!-- flutter-test-action:Unit test results -->\nnew'
    })
    expect(octokit.rest.issues.createComment).not.toHaveBeenCalled()
  })

  test('creates a comment when none exists', async () => {
    const octokit = createOctokit()

    const result = await upsertComment(
      octokit as unknown as Octokit,
      context,
      'Unit test results',
      'new'
    )

    expect(result).toBe('created')
    expect(octokit.rest.issues.createComment).toHaveBeenCalledWith(
      expect.objectContaining({issue_number: 7})
    )
  })

  test('skips outside of pull requests', async () => {
    const octokit = createOctokit()

    const result = await upsertComment(
      octokit as unknown as Octokit,
      {...context, pullNumber: undefined},
      'T',
      'new'
    )

    expect(result).toBe('skipped')
    expect(octokit.paginate).not.toHaveBeenCalled()
  })
})

describe('createCheckRun', () => {
  test('sends annotations in batches of 50', async () => {
    const octokit = createOctokit()
    const annotations = Array.from({length: 120}, (_, i) => annotation(i + 1))

    const url = await createCheckRun(octokit as unknown as Octokit, context, {
      name: 'Unit test results',
      conclusion: 'failure',
      title: '2 failed',
      summary: 'summary',
      text: 'text',
      annotations
    })

    expect(url).toBe('https://github.com/octo/app/runs/99')
    const created = octokit.rest.checks.create.mock.calls[0] as unknown[]
    expect(created[0]).toMatchObject({
      name: 'Unit test results',
      head_sha: 'abc',
      conclusion: 'failure',
      output: {title: '2 failed', summary: 'summary', text: 'text'}
    })
    const batches = [
      (created[0] as {output: {annotations: Annotation[]}}).output.annotations,
      ...octokit.rest.checks.update.mock.calls.map(
        call =>
          (call[0] as {output: {annotations: Annotation[]}}).output.annotations
      )
    ]
    expect(batches.map(b => b.length)).toEqual([50, 50, 20])
    expect(octokit.rest.checks.update).toHaveBeenCalledWith(
      expect.objectContaining({check_run_id: 99})
    )
  })
})

describe('fetchChangedFiles', () => {
  test('returns the added lines of files with a patch', async () => {
    const octokit = createOctokit()
    octokit.paginate.mockResolvedValueOnce([
      {
        filename: 'lib/a.dart',
        status: 'modified',
        patch: '@@ -1 +1,2 @@\n a\n+b'
      },
      {filename: 'lib/b.dart', status: 'removed', patch: '@@ -1 +0,0 @@\n-a'},
      {filename: 'big.dart', status: 'modified'}
    ])

    const files = await fetchChangedFiles(
      octokit as unknown as Octokit,
      context
    )

    expect(files).toEqual([{path: 'lib/a.dart', addedLines: [2]}])
  })
})
