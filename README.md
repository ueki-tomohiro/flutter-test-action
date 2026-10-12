<p align="center">
  <a href="https://github.com/ueki-tomohiro/flutter-test-action/actions">
    <img
      alt="build-test status"
      src="https://github.com/ueki-tomohiro/flutter-test-action/workflows/build-test/badge.svg"
    >
  </a>
</p>

# Flutter Test Report

Runs `flutter test` and reports the result where a reviewer looks: a check run, a pull request comment, annotations on the diff and the job summary.

The report answers three questions:

- **What failed, where, and why.** Each failed test links to the line that defines it, with the `Expected` / `Actual` message, the stack frames from your project and the test's print output. Files that failed to load, such as compilation errors, are reported too.
- **Is the changed code tested.** With coverage enabled, the report shows the coverage of the lines changed by the pull request, lists the uncovered line ranges, and annotates them on the diff. Changed files that no test loads at all are listed separately.
- **What slows the suite down.** The slowest tests and the skipped tests (with their reasons) are listed.

## Usage

```yaml
name: test

on:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      checks: write        # check run and annotations
      pull-requests: write # pull request comment and changed files
    steps:
      - uses: actions/checkout@v6
        with:
          persist-credentials: false
      - uses: subosito/flutter-action@v2
        with:
          channel: stable
      - uses: ueki-tomohiro/flutter-test-action@v2
        with:
          workingDirectory: packages/app
          testArgs: --concurrency 8
          coverage: true
          title: Unit test results
```

The step fails when a test fails, a test file fails to load, `flutter test` exits with an error, or a coverage threshold is not met. Set `failOnError: false` to only report.

Use a different `title` for each run in the same pull request. The title names the check run and identifies the comment, so each run keeps its own comment.

## Example report

```markdown
## ❌ Unit test results

**2 failed** · **1 failed to load** · 2 passed · 1 skipped · ⏱ 5.0 s
Coverage **62.5%** · Changed lines **50.0%** (3/6)

### ❌ Failed tests (2)

#### LoginPage validation › shows error when password is empty

[`packages/app/test/login_test.dart:42`](…) · 340 ms

    The following TestFailure was thrown running a test:
    Expected: 'Password is required'
      Actual: null

▶ Stack trace

### 💥 Failed to load (1)
…

### 📉 Changed lines without coverage

| File | Covered | Uncovered lines |
| ---- | ----: | ---- |
| `packages/app/lib/login.dart` | 2/5 (40.0%) | L5-6, L9 |

▶ 🐢 Slowest tests (4)
▶ ⏭ Skipped tests (1)
```

See [`__tests__/__snapshots__/`](__tests__/__snapshots__/) for complete examples of the comment and the check run.

## Inputs

| Name | Default | Description |
| ---- | ---- | ---- |
| `workingDirectory` | `.` | Directory to run `flutter test` in |
| `testArgs` | `''` | Extra arguments for `flutter test`, such as `--concurrency 8 test/unit`. Quotes are supported |
| `flutterCommand` | `flutter` | Command used to run Flutter, such as `fvm flutter` |
| `coverage` | `false` | Run with `--coverage` and report `coverage/lcov.info` |
| `coverageThreshold` | `''` | Minimum overall line coverage in percent. Empty means report only |
| `changedLinesCoverageThreshold` | `''` | Minimum coverage of the changed lines in percent. Empty means report only |
| `annotateUncoveredLines` | `true` | Annotate changed lines that are not covered by tests |
| `machinePath` | `''` | Report an existing `flutter test --machine` output instead of running the tests |
| `coveragePath` | `''` | Report an existing `lcov.info` instead of running the tests |
| `failOnError` | `true` | Fail the step when the conclusion is `failure` |
| `title` | `Flutter test results` | Name of the check run. Also identifies the pull request comment |
| `token` | `${{ github.token }}` | Token for the check run, the comment and the changed files. Empty disables all three |

When `machinePath` or `coveragePath` is set, the action does not run `flutter test` and reports the given files.

## Outputs

| Name | Description |
| ---- | ---- |
| `conclusion` | `success` or `failure` |
| `tests`, `passed`, `failed`, `skipped` | Number of tests |
| `duration` | Duration of the test run in milliseconds |
| `exit-code` | Exit code of `flutter test` |
| `machine-path` | Path of the saved `flutter test --machine` output, for example to upload as an artifact |
| `coverage`, `coverage-hit`, `coverage-found` | Overall line coverage |
| `changed-lines-coverage` | Coverage of the lines changed by the pull request |
| `check-run-url` | URL of the created check run |

## Permissions and security

- The check run needs `checks: write`. The comment needs `pull-requests: write`. Reading the changed files needs `pull-requests: read`.
- If the token lacks a permission, the action logs a warning and still reports in the job summary and the log.
- The tests run without the action's inputs and the runner's credentials in their environment, as in a plain `run:` step. They still run as the same user as the action, so treat the job as running the pull request's code with the job's token.
- On pull requests from forks, `GITHUB_TOKEN` is read-only, so the check run and comment are skipped.

## Migrating from v1

- The action now runs `flutter test` itself. Remove the steps that wrote `test.json` and the `if: failure()` condition, and pass the arguments through `testArgs`.
- To keep running the tests yourself, pass `machinePath` and `coveragePath` as before.
- The step now fails when tests fail. Set `failOnError: false` for the v1 behavior.
- `coverageThreshold` no longer defaults to `80`. Set it explicitly to keep a coverage gate.
- Comments are identified by `title`, so v2 creates a new comment instead of updating the v1 comment.

## Development

This repository uses `mise`, `pnpm`, `oxlint`, `oxfmt`, `vitest`, and `lefthook`.

```sh
mise install
pnpm install
pnpm all
```

`pnpm install` runs `lefthook install`, so `pre-commit` formats and lints staged TypeScript files and `pre-push` runs the tests.

The report snapshots in `__tests__/__snapshots__/` are rendered Markdown. Review their diff when you change the report, and update them with `pnpm vitest run -u`.

This repository commits `dist/` on purpose, because GitHub Actions runs the checked-in bundle. Regenerate it when you change runtime code:

```sh
pnpm package
```
