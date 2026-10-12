import {describe, expect, test} from 'vitest'
import {
  cleanErrorMessage,
  codeBlock,
  escapeMarkdown,
  formatDuration,
  projectFrames,
  splitExceptionReports,
  truncateText
} from '../src/report/format'

describe('formatDuration', () => {
  test('uses a unit that fits the value', () => {
    expect(formatDuration(120)).toBe('120 ms')
    expect(formatDuration(12345)).toBe('12.3 s')
    expect(formatDuration(151000)).toBe('2m 31s')
  })
})

describe('escapeMarkdown', () => {
  test('escapes characters that change the meaning of Markdown', () => {
    expect(escapeMarkdown('a | b <Widget> *x*')).toBe(
      'a \\| b \\<Widget\\> \\*x\\*'
    )
  })
})

describe('codeBlock', () => {
  test('uses a fence longer than any fence in the content', () => {
    expect(codeBlock('```dart\nx\n```')).toBe('````text\n```dart\nx\n```\n````')
  })
})

describe('truncateText', () => {
  test('notes that the text was truncated', () => {
    expect(truncateText('a\nb\nc', 2)).toBe('a\nb\n… (truncated)')
    expect(truncateText('a\nb', 2)).toBe('a\nb')
  })
})

describe('projectFrames', () => {
  test('drops frames of the SDK and the test framework', () => {
    const stack = [
      'package:matcher/src/expect/expect.dart 149:31  fail',
      'package:flutter_test/src/widget_tester.dart 189:15  testWidgets.<fn>',
      'test/login_test.dart 72:7  main.<fn>.<fn>',
      '===== asynchronous gap ===========================',
      'dart:async  _CustomZone.run',
      'package:my_app/login.dart 10:3  Login.submit'
    ].join('\n')

    expect(projectFrames(stack)).toBe(
      [
        'test/login_test.dart 72:7  main.<fn>.<fn>',
        'package:my_app/login.dart 10:3  Login.submit'
      ].join('\n')
    )
  })

  test('handles the Flutter stack format', () => {
    const stack = [
      '#0      main.<anonymous closure> (file:///repo/test/a_test.dart:28:5)',
      '#1      testWidgets.<anonymous closure> (package:flutter_test/src/widget_tester.dart:189:15)',
      '<asynchronous suspension>'
    ].join('\n')

    expect(projectFrames(stack)).toBe(
      '#0      main.<anonymous closure> (file:///repo/test/a_test.dart:28:5)'
    )
  })
})

describe('cleanErrorMessage', () => {
  test('keeps the explanation of a Flutter exception report', () => {
    const message = [
      '══╡ EXCEPTION CAUGHT BY FLUTTER TEST FRAMEWORK ╞════════════════════',
      'The following TestFailure was thrown running a test:',
      "Expected: 'a'",
      '  Actual: null',
      '',
      'When the exception was thrown, this was the stack:',
      '#4      main.<anonymous closure> (file:///repo/test/a_test.dart:28:5)',
      '<asynchronous suspension>',
      '(elided one frame from package:stack_trace)',
      '',
      'This was caught by the test expectation on the following line:',
      '  file:///repo/test/a_test.dart line 28',
      'The test description was:',
      '  shows a',
      '════════════════════════════════════════════════════════════════════'
    ].join('\n')

    expect(cleanErrorMessage(message)).toBe(
      [
        'The following TestFailure was thrown running a test:',
        "Expected: 'a'",
        '  Actual: null',
        '',
        'This was caught by the test expectation on the following line:',
        '  file:///repo/test/a_test.dart line 28'
      ].join('\n')
    )
  })
})

describe('splitExceptionReports', () => {
  test('separates exception reports from other output', () => {
    const result = splitExceptionReports([
      'before',
      '══╡ EXCEPTION CAUGHT BY WIDGETS LIBRARY ╞════════════════\nboom\n══════════════════════════════════════',
      'after'
    ])

    expect(result.exceptions).toEqual([
      '══╡ EXCEPTION CAUGHT BY WIDGETS LIBRARY ╞════════════════\nboom\n══════════════════════════════════════'
    ])
    expect(result.output).toEqual(['before', 'after'])
  })
})
