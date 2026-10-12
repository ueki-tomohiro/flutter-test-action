import {describe, expect, test} from 'vitest'
import {computeChangedLinesCoverage, parseAddedLines} from '../src/diff'
import {parseLcovFile} from '../src/coverage'
import {createPathContext, toRepoPath} from '../src/paths'

describe('parseAddedLines', () => {
  test('returns the line numbers of added lines in the new file', () => {
    const patch = [
      '@@ -1,4 +1,5 @@',
      ' import a;',
      '-old();',
      '+newA();',
      '+newB();',
      ' keep();',
      ' keep();',
      '@@ -20,2 +21,3 @@ class A {',
      ' x();',
      '+y();',
      ' z();',
      '\\ No newline at end of file'
    ].join('\n')

    expect(parseAddedLines(patch)).toEqual([2, 3, 22])
  })
})

describe('toRepoPath', () => {
  const context = createPathContext('packages/app', '/workspace/repo')

  test('converts file URLs and relative lcov paths', () => {
    expect(
      toRepoPath(
        'file:///workspace/repo/packages/app/test/a_test.dart',
        context
      )
    ).toBe('packages/app/test/a_test.dart')
    expect(toRepoPath('lib/a.dart', context)).toBe('packages/app/lib/a.dart')
    expect(toRepoPath('/workspace/repo/packages/app/lib/a.dart', context)).toBe(
      'packages/app/lib/a.dart'
    )
  })

  test('returns undefined outside of the repository', () => {
    expect(
      toRepoPath('package:flutter_test/src/widget_tester.dart', context)
    ).toBeUndefined()
    expect(toRepoPath('/other/a_test.dart', context)).toBeUndefined()
  })
})

describe('computeChangedLinesCoverage', () => {
  test('counts instrumented changed lines and groups uncovered ranges', async () => {
    const coverage = await parseLcovFile('__tests__/data/lcov_changed.info')
    const context = createPathContext('packages/app', '/workspace/repo')

    const result = computeChangedLinesCoverage(
      [
        {path: 'packages/app/lib/login.dart', addedLines: [2, 5, 6, 7, 8, 9]},
        {path: 'packages/app/lib/util.dart', addedLines: [1]},
        {path: 'packages/app/lib/new_page.dart', addedLines: [1, 2, 3]},
        {path: 'packages/app/lib/model.g.dart', addedLines: [1]},
        {path: 'packages/app/test/login_test.dart', addedLines: [1]},
        {path: 'README.md', addedLines: [1]}
      ],
      coverage,
      context
    )

    expect(result.files).toEqual([
      {
        path: 'packages/app/lib/login.dart',
        covered: 2,
        total: 5,
        uncovered: [
          {start: 5, end: 6},
          {start: 9, end: 9}
        ]
      },
      {path: 'packages/app/lib/util.dart', covered: 1, total: 1, uncovered: []}
    ])
    expect(result.covered).toBe(3)
    expect(result.total).toBe(6)
    expect(result.missingFiles).toEqual(['packages/app/lib/new_page.dart'])
  })
})
