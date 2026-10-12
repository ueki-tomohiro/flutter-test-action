import {createWriteStream, statSync} from 'fs'
import {once} from 'events'
import path from 'path'

export interface RunOptions {
  flutterCommand: string
  workingDirectory: string
  testArgs: string
  coverage: boolean
  // Where to write the JSON lines of the machine output.
  outputPath: string
}

export interface RunResult {
  exitCode: number
  machinePath: string
  coveragePath?: string
  // Last lines written to stderr, shown when the run fails without a failed
  // test (for example, a crash of the test runner).
  stderrTail: string[]
}

const stderrTailSize = 50

// Credentials the runner hands to JavaScript actions. A plain `run:` step does
// not receive them, so the tests should not either.
const secretEnvNames = new Set([
  'ACTIONS_RUNTIME_TOKEN',
  'ACTIONS_ID_TOKEN_REQUEST_TOKEN',
  'ACTIONS_ID_TOKEN_REQUEST_URL'
])

export function testEnvironment(
  env: NodeJS.ProcessEnv = process.env
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [name, value] of Object.entries(env)) {
    if (value === undefined) continue
    if (name.startsWith('INPUT_') || secretEnvNames.has(name)) continue
    result[name] = value
  }
  return result
}

export function buildCommandLine(options: RunOptions): string {
  const parts = [options.flutterCommand, 'test', '--machine']
  if (options.coverage) parts.push('--coverage')
  if (options.testArgs.trim()) parts.push(options.testArgs.trim())
  return parts.join(' ')
}

export async function runFlutterTest(options: RunOptions): Promise<RunResult> {
  const [core, {exec}] = await Promise.all([
    import('@actions/core'),
    import('@actions/exec')
  ])

  const cwd = path.resolve(options.workingDirectory || '.')
  const commandLine = buildCommandLine(options)
  const output = createWriteStream(options.outputPath, {encoding: 'utf8'})
  const stderrTail: string[] = []

  core.info(`Running: ${commandLine} (in ${cwd})`)
  const startedAt = Date.now()

  let exitCode: number
  try {
    exitCode = await exec(commandLine, [], {
      cwd,
      env: testEnvironment(),
      ignoreReturnCode: true,
      // The machine output is thousands of JSON lines. Only the plain output
      // is shown in the log.
      silent: true,
      listeners: {
        stdline: line => {
          if (isJsonLine(line)) {
            output.write(`${line}\n`)
          } else if (line.trim()) {
            core.info(line)
          }
        },
        errline: line => {
          core.info(line)
          stderrTail.push(line)
          if (stderrTail.length > stderrTailSize) stderrTail.shift()
        }
      }
    })
  } finally {
    output.end()
    await once(output, 'close')
  }

  let coveragePath: string | undefined
  if (options.coverage) {
    const lcov = path.join(cwd, 'coverage', 'lcov.info')
    // A file left by an earlier run must not be reported as this run's
    // coverage, for example when flutter test fails before running tests.
    if (modifiedSince(lcov, startedAt)) {
      coveragePath = lcov
    } else {
      core.warning(`Coverage was enabled, but ${lcov} was not created.`)
    }
  }

  return {exitCode, machinePath: options.outputPath, coveragePath, stderrTail}
}

function modifiedSince(file: string, time: number): boolean {
  try {
    // Allow for file systems that store modification times in whole seconds.
    return statSync(file).mtimeMs >= Math.floor(time / 1000) * 1000
  } catch {
    return false
  }
}

function isJsonLine(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return false
  try {
    JSON.parse(trimmed)
    return true
  } catch {
    return false
  }
}
