import {beforeEach, describe, expect, test, vi} from 'vitest'
import {Reporter} from '../src/model/reporter'

function createReporter(
  overrides: Partial<{
    summary: string
    detail: string
    comment: string
    status: 'success' | 'failure'
    outputs: Record<string, string>
  }> = {}
): Reporter {
  return new Reporter({
    summary: overrides.summary ?? 'summary',
    detail: overrides.detail ?? 'detail',
    comment: overrides.comment ?? 'comment',
    annotations: [],
    status: overrides.status ?? 'success',
    outputs: overrides.outputs ?? {tests: '1'}
  })
}

describe('formatter', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    delete process.env['GITHUB_STEP_SUMMARY']
  })

  test('skips pull request comment outside pull_request events', async () => {
    const createComment = vi.fn()
    const createCheck = vi.fn()
    const setOutput = vi.fn()
    const paginate = vi.fn()

    const core = {
      getInput: vi.fn((name: string) => {
        if (name === 'token') return 'token'
        if (name === 'title') return 'Flutter test results'
        return ''
      }),
      error: vi.fn(),
      info: vi.fn(),
      setFailed: vi.fn(),
      setOutput
    }

    vi.doMock('@actions/core', () => core)
    vi.doMock('@actions/github', () => ({
      getOctokit: vi.fn(() => ({
        paginate,
        rest: {
          issues: {
            createComment,
            listComments: vi.fn(),
            updateComment: vi.fn()
          },
          checks: {
            create: createCheck
          }
        }
      })),
      context: {
        repo: {
          owner: 'ueki-tomohiro',
          repo: 'flutter-test-action'
        },
        payload: {},
        issue: {},
        sha: 'push-sha'
      }
    }))

    const {exportReport} = await import('../src/formatter')

    await exportReport({report: createReporter()})

    expect(createComment).not.toHaveBeenCalled()
    expect(createCheck).toHaveBeenCalledWith(
      expect.objectContaining({
        head_sha: 'push-sha'
      })
    )
    expect(setOutput).toHaveBeenCalledWith('conclusion', 'success')
    expect(setOutput).toHaveBeenCalledWith('tests', '1')
    expect(core.info).toHaveBeenCalledWith(
      'Skipping pull request comment because the workflow is not running for a pull request.'
    )
    expect(core.setFailed).not.toHaveBeenCalled()
  })

  test('creates a pull request comment when pull_request context exists', async () => {
    const createComment = vi.fn()
    const createCheck = vi.fn()
    const setOutput = vi.fn()
    const updateComment = vi.fn()
    const paginate = vi.fn().mockResolvedValue([])

    const core = {
      getInput: vi.fn((name: string) => {
        if (name === 'token') return 'token'
        if (name === 'title') return 'Flutter test results'
        return ''
      }),
      error: vi.fn(),
      info: vi.fn(),
      setFailed: vi.fn(),
      setOutput
    }

    vi.doMock('@actions/core', () => core)
    vi.doMock('@actions/github', () => ({
      getOctokit: vi.fn(() => ({
        paginate,
        rest: {
          issues: {
            createComment,
            listComments: vi.fn(),
            updateComment
          },
          checks: {
            create: createCheck
          }
        }
      })),
      context: {
        repo: {
          owner: 'ueki-tomohiro',
          repo: 'flutter-test-action'
        },
        payload: {
          pull_request: {
            number: 133,
            head: {
              sha: 'pr-head-sha'
            }
          }
        },
        issue: {},
        sha: 'push-sha'
      }
    }))

    const {exportReport} = await import('../src/formatter')

    await exportReport({report: createReporter()})

    expect(createComment).toHaveBeenCalledWith(
      expect.objectContaining({
        issue_number: 133,
        body: expect.stringContaining('comment')
      })
    )
    expect(createComment).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining('<!-- flutter-test-action-comment -->')
      })
    )
    expect(updateComment).not.toHaveBeenCalled()
    expect(createCheck).toHaveBeenCalledWith(
      expect.objectContaining({
        head_sha: 'pr-head-sha'
      })
    )
    expect(setOutput).toHaveBeenCalledWith('conclusion', 'success')
    expect(core.setFailed).not.toHaveBeenCalled()
  })

  test('updates the existing sticky pull request comment when present', async () => {
    const createComment = vi.fn()
    const updateComment = vi.fn()
    const createCheck = vi.fn()
    const setOutput = vi.fn()
    const paginate = vi.fn().mockResolvedValue([
      {
        id: 456,
        body: '<!-- flutter-test-action-comment -->\nold comment'
      }
    ])

    const core = {
      getInput: vi.fn((name: string) => {
        if (name === 'token') return 'token'
        if (name === 'title') return 'Flutter test results'
        return ''
      }),
      error: vi.fn(),
      info: vi.fn(),
      setFailed: vi.fn(),
      setOutput
    }

    vi.doMock('@actions/core', () => core)
    vi.doMock('@actions/github', () => ({
      getOctokit: vi.fn(() => ({
        paginate,
        rest: {
          issues: {
            createComment,
            listComments: vi.fn(),
            updateComment
          },
          checks: {
            create: createCheck
          }
        }
      })),
      context: {
        repo: {
          owner: 'ueki-tomohiro',
          repo: 'flutter-test-action'
        },
        payload: {
          pull_request: {
            number: 133,
            head: {
              sha: 'pr-head-sha'
            }
          }
        },
        issue: {},
        sha: 'push-sha'
      }
    }))

    const {exportReport} = await import('../src/formatter')

    await exportReport({report: createReporter()})

    expect(createComment).not.toHaveBeenCalled()
    expect(updateComment).toHaveBeenCalledWith(
      expect.objectContaining({
        comment_id: 456,
        body: expect.stringContaining('<!-- flutter-test-action-comment -->')
      })
    )
    expect(createCheck).toHaveBeenCalled()
    expect(core.setFailed).not.toHaveBeenCalled()
  })

  test('fails the combined conclusion when coverage fails', async () => {
    const createCheck = vi.fn()
    const setOutput = vi.fn()
    const paginate = vi.fn()

    const core = {
      getInput: vi.fn((name: string) => {
        if (name === 'token') return 'token'
        if (name === 'title') return 'Flutter test results'
        return ''
      }),
      error: vi.fn(),
      info: vi.fn(),
      setFailed: vi.fn(),
      setOutput
    }

    vi.doMock('@actions/core', () => core)
    vi.doMock('@actions/github', () => ({
      getOctokit: vi.fn(() => ({
        paginate,
        rest: {
          issues: {
            createComment: vi.fn(),
            listComments: vi.fn(),
            updateComment: vi.fn()
          },
          checks: {
            create: createCheck
          }
        }
      })),
      context: {
        repo: {
          owner: 'ueki-tomohiro',
          repo: 'flutter-test-action'
        },
        payload: {},
        issue: {},
        sha: 'push-sha'
      }
    }))

    const {exportReport} = await import('../src/formatter')

    await exportReport({
      report: createReporter({status: 'success', outputs: {tests: '3'}}),
      coverage: createReporter({
        status: 'failure',
        comment: 'coverage comment',
        outputs: {coverage: '79.9'}
      })
    })

    expect(setOutput).toHaveBeenCalledWith('conclusion', 'failure')
    expect(setOutput).toHaveBeenCalledWith('coverage', '79.9')
    expect(createCheck).toHaveBeenCalledWith(
      expect.objectContaining({
        conclusion: 'failure'
      })
    )
    expect(core.setFailed).not.toHaveBeenCalled()
  })
})
