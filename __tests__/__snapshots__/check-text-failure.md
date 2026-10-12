### Test files

| File | Tests | ✅ | ❌ | ⏭ | Time |
| ---- | ----: | ----: | ----: | ----: | ----: |
| `packages/app/test/login_test.dart` | 5 | 2 | 2 | 1 | 3.6 s |

<details><summary>🐢 Slowest tests (4)</summary>

| Test | File | Time |
| ---- | ---- | ----: |
| formats the greeting | [`packages/app/test/login_test.dart:90`](https://github.com/octo/app/blob/0123456789abcdef/packages/app/test/login_test.dart#L90) | 3.0 s |
| LoginPage validation › shows error when password is empty | [`packages/app/test/login_test.dart:42`](https://github.com/octo/app/blob/0123456789abcdef/packages/app/test/login_test.dart#L42) | 340 ms |
| LoginPage › remembers the email | [`packages/app/test/login_test.dart:70`](https://github.com/octo/app/blob/0123456789abcdef/packages/app/test/login_test.dart#L70) | 190 ms |
| LoginPage validation › accepts a valid password | [`packages/app/test/login_test.dart:55`](https://github.com/octo/app/blob/0123456789abcdef/packages/app/test/login_test.dart#L55) | 40 ms |

</details>

<details><summary>⏭ Skipped tests (1)</summary>

- LoginPage › supports passkeys — Waiting for the passkey API ([`packages/app/test/login_test.dart:80`](https://github.com/octo/app/blob/0123456789abcdef/packages/app/test/login_test.dart#L80))

</details>

### Uncovered changed lines

- `packages/app/lib/login.dart`: L5-6, L9

### Lowest coverage files

| File | Lines | Coverage |
| ---- | ----: | ----: |
| `packages/app/lib/login.dart` | 3/6 | 50.0% |