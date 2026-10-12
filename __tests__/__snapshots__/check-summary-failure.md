## ❌ Unit test results

**2 failed** · **1 failed to load** · 2 passed · 1 skipped · ⏱ 5.0 s  
Coverage **62.5%** · Changed lines **50.0%** (3/6)

### ❌ Failed tests (2)

#### LoginPage validation › shows error when password is empty

[`packages/app/test/login_test.dart:42`](https://github.com/octo/app/blob/0123456789abcdef/packages/app/test/login_test.dart#L42) · 340 ms

```text
The following TestFailure was thrown running a test:
Expected: 'Password is required'
  Actual: null

This was caught by the test expectation on the following line:
  file:///workspace/repo/packages/app/test/login_test.dart line 48
```

<details><summary>Stack trace</summary>

```text
#4      main.<anonymous closure>.<anonymous closure>.<anonymous closure> (file:///workspace/repo/packages/app/test/login_test.dart:48:7)
<asynchronous suspension>
#5      testWidgets.<anonymous closure>.<anonymous closure> (package:flutter_test/src/widget_tester.dart:189:15)
<asynchronous suspension>
(elided one frame from package:stack_trace)
```

</details>

#### LoginPage › remembers the email

[`packages/app/test/login_test.dart:70`](https://github.com/octo/app/blob/0123456789abcdef/packages/app/test/login_test.dart#L70) · 190 ms

```text
Expected: <true>
  Actual: <false>
```

<details><summary>Stack trace</summary>

```text
package:matcher/src/expect/expect.dart 149:31  fail
package:matcher/src/expect/expect.dart 144:3   _expect
package:matcher/src/expect/expect.dart 56:3    expect
test/login_test.dart 72:7                      main.<fn>.<fn>
```

</details>

### 💥 Failed to load (1)

#### [`packages/app/test/broken_test.dart`](https://github.com/octo/app/blob/0123456789abcdef/packages/app/test/broken_test.dart)

```text
Failed to load "/workspace/repo/packages/app/test/broken_test.dart":
test/broken_test.dart:5:3: Error: Method not found: 'missing'.
  missing();
  ^^^^^^^
```

### 📉 Changed lines without coverage

| File | Covered | Uncovered lines |
| ---- | ----: | ---- |
| [`packages/app/lib/login.dart`](https://github.com/octo/app/blob/0123456789abcdef/packages/app/lib/login.dart) | 2/5 (40.0%) | [L5-6](https://github.com/octo/app/blob/0123456789abcdef/packages/app/lib/login.dart#L5-L6), [L9](https://github.com/octo/app/blob/0123456789abcdef/packages/app/lib/login.dart#L9) |

1 other changed file is fully covered.

**Not loaded by any test** (these files are missing from the coverage report):

- [`packages/app/lib/new_page.dart`](https://github.com/octo/app/blob/0123456789abcdef/packages/app/lib/new_page.dart)

<!-- flutter-test-action-data {"version":1,"conclusion":"failure","tests":{"total":5,"passed":2,"failed":2,"skipped":1,"loadFailures":1,"durationMs":5000},"coverage":{"hit":5,"found":8},"changedLines":{"covered":3,"total":6}} -->