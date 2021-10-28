import * as core from '@actions/core'
import * as github from '@actions/github'
import {Octokit} from '@octokit/action'
import {Reporter} from './model/reporter'

type ExportReport = (report: Reporter) => Promise<void>

const charactersLimit = 65535

export const exportReport: ExportReport = async report => {
  try {
    if (core.getInput('token')) {
      const octokit = new Octokit()

      const owner = github.context.repo.owner
      const repo = github.context.repo.repo

      const pr = github.context.payload.pull_request
      const sha = (pr && pr.head.sha) || github.context.sha

      let title = core.getInput('title')
      if (title.length > charactersLimit) {
        core.error(
          `The 'title' will be truncated because the character limit (${charactersLimit}) exceeded.`
        )
        title = title.substring(0, charactersLimit)
      }
      let summary = report.summary
      if (summary.length > charactersLimit) {
        core.error(
          `The 'summary' will be truncated because the character limit (${charactersLimit}) exceeded.`
        )
        summary = summary.substring(0, charactersLimit)
      }
      let reportDetail = report.detail
      if (reportDetail.length > charactersLimit) {
        core.error(
          `The 'text' will be truncated because the character limit (${charactersLimit}) exceeded.`
        )
        reportDetail = reportDetail.substring(0, charactersLimit)
      }

      if (report.annotations.length > 50) {
        core.error('Annotations that exceed the limit (50) will be truncated.')
      }
      const annotations = report.annotations.slice(0, 50)
      await octokit.checks.create({
        owner,
        repo,
        name: title,
        head_sha: sha,
        status: 'completed',
        conclusion: report.status,
        output: {
          title,
          summary,
          text: reportDetail,
          annotations
        }
      })
    }
  } catch (error) {
    core.setFailed((error as Error).message)
  }
}
