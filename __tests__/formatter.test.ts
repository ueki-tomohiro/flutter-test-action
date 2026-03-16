import {beforeEach, describe, expect, test, vi} from 'vitest'
import {Reporter} from '../src/model/reporter'

function createReporter(): Reporter {
  return new Reporter({
    summary: 'summary',
    detail: 'detail',
    comment: 'comment',
    annotations: [],
    status: 'success'
  })
}

describe('formatter', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  test('skips pull request comment outside pull_request events', async () => {
    const createComment = vi.fn()
    const createCheck = vi.fn()

    const core = {
      getInput: vi.fn((name: string) => {
        if (name === 'token') return 'token'
        if (name === 'title') return 'Flutter test results'
        return ''
      }),
      error: vi.fn(),
      info: vi.fn(),
      setFailed: vi.fn()
    }

    vi.doMock('@actions/core', () => core)
    vi.doMock('@actions/github', () => ({
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
    class MockOctokit {
      issues = {
        createComment
      }
      checks = {
        create: createCheck
      }
    }
    vi.doMock('@octokit/action', () => ({
      Octokit: MockOctokit
    }))

    const {exportReport} = await import('../src/formatter')

    await exportReport({report: createReporter()})

    expect(createComment).not.toHaveBeenCalled()
    expect(createCheck).toHaveBeenCalledWith(
      expect.objectContaining({
        head_sha: 'push-sha'
      })
    )
    expect(core.info).toHaveBeenCalledWith(
      'Skipping pull request comment because the workflow is not running for a pull request.'
    )
    expect(core.setFailed).not.toHaveBeenCalled()
  })

  test('creates a pull request comment when pull_request context exists', async () => {
    const createComment = vi.fn()
    const createCheck = vi.fn()

    const core = {
      getInput: vi.fn((name: string) => {
        if (name === 'token') return 'token'
        if (name === 'title') return 'Flutter test results'
        return ''
      }),
      error: vi.fn(),
      info: vi.fn(),
      setFailed: vi.fn()
    }

    vi.doMock('@actions/core', () => core)
    vi.doMock('@actions/github', () => ({
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
    class MockOctokit {
      issues = {
        createComment
      }
      checks = {
        create: createCheck
      }
    }
    vi.doMock('@octokit/action', () => ({
      Octokit: MockOctokit
    }))

    const {exportReport} = await import('../src/formatter')

    await exportReport({report: createReporter()})

    expect(createComment).toHaveBeenCalledWith(
      expect.objectContaining({
        issue_number: 133,
        body: 'comment'
      })
    )
    expect(createCheck).toHaveBeenCalledWith(
      expect.objectContaining({
        head_sha: 'pr-head-sha'
      })
    )
    expect(core.setFailed).not.toHaveBeenCalled()
  })
})
