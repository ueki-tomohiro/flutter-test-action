import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  utimesSync,
  writeFileSync
} from 'fs'
import os from 'os'
import path from 'path'
import {buildCommandLine, testEnvironment} from '../src/runner'

describe('buildCommandLine', () => {
  test('adds --machine, --coverage and the extra arguments', () => {
    expect(
      buildCommandLine({
        flutterCommand: 'fvm flutter',
        workingDirectory: '.',
        testArgs: ' --concurrency 8 test/a_test.dart ',
        coverage: true,
        outputPath: 'out.json'
      })
    ).toBe(
      'fvm flutter test --machine --coverage --concurrency 8 test/a_test.dart'
    )
  })
})

describe('testEnvironment', () => {
  test('removes action inputs and runner credentials', () => {
    expect(
      testEnvironment({
        PATH: '/bin',
        INPUT_TOKEN: 'secret',
        ACTIONS_RUNTIME_TOKEN: 'secret',
        ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'secret',
        GITHUB_WORKSPACE: '/repo'
      })
    ).toEqual({PATH: '/bin', GITHUB_WORKSPACE: '/repo'})
  })
})

describe('runFlutterTest', () => {
  const info = vi.fn()
  const warning = vi.fn()
  const exec = vi.fn()

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.doMock('@actions/core', () => ({info, warning}))
    vi.doMock('@actions/exec', () => ({exec}))
    process.env['INPUT_TOKEN'] = 'secret'
  })

  afterEach(() => {
    delete process.env['INPUT_TOKEN']
  })

  test('writes only the JSON lines and returns the exit code', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'runner-test-'))
    const outputPath = path.join(dir, 'machine.json')
    exec.mockImplementation(async (_command, _args, options) => {
      options.listeners.stdline('Resolving dependencies...')
      options.listeners.stdline('{"type":"start","time":0}')
      options.listeners.stdline('[{"event":"test.startedProcess"}]')
      options.listeners.errline('Some warning')
      return 1
    })

    const {runFlutterTest} = await import('../src/runner')
    const result = await runFlutterTest({
      flutterCommand: 'flutter',
      workingDirectory: dir,
      testArgs: '',
      coverage: true,
      outputPath
    })

    expect(exec).toHaveBeenCalledWith(
      'flutter test --machine --coverage',
      [],
      expect.objectContaining({cwd: dir, ignoreReturnCode: true, silent: true})
    )
    expect(exec.mock.calls[0][2].env['INPUT_TOKEN']).toBeUndefined()
    expect(readFileSync(outputPath, 'utf8')).toBe(
      '{"type":"start","time":0}\n[{"event":"test.startedProcess"}]\n'
    )
    expect(info).toHaveBeenCalledWith('Resolving dependencies...')
    expect(result).toEqual({
      exitCode: 1,
      machinePath: outputPath,
      coveragePath: undefined,
      stderrTail: ['Some warning']
    })
    expect(warning).toHaveBeenCalledWith(
      expect.stringContaining('coverage/lcov.info was not created')
    )
  })

  test('ignores coverage left by an earlier run', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'runner-test-'))
    const lcov = path.join(dir, 'coverage', 'lcov.info')
    mkdirSync(path.dirname(lcov))
    writeFileSync(lcov, 'SF:lib/a.dart\nend_of_record\n')
    utimesSync(lcov, new Date(2020, 0, 1), new Date(2020, 0, 1))
    exec.mockResolvedValue(1)

    const {runFlutterTest} = await import('../src/runner')
    const result = await runFlutterTest({
      flutterCommand: 'flutter',
      workingDirectory: dir,
      testArgs: '',
      coverage: true,
      outputPath: path.join(dir, 'machine.json')
    })

    expect(result.coveragePath).toBeUndefined()
  })

  test('uses coverage written by this run', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'runner-test-'))
    const lcov = path.join(dir, 'coverage', 'lcov.info')
    exec.mockImplementation(async () => {
      mkdirSync(path.dirname(lcov))
      writeFileSync(lcov, 'SF:lib/a.dart\nend_of_record\n')
      return 0
    })

    const {runFlutterTest} = await import('../src/runner')
    const result = await runFlutterTest({
      flutterCommand: 'flutter',
      workingDirectory: dir,
      testArgs: '',
      coverage: true,
      outputPath: path.join(dir, 'machine.json')
    })

    expect(result.coveragePath).toBe(lcov)
  })
})
