<p align="center">
  <a href="https://github.com/actions/typescript-action/actions"><img alt="typescript-action status" src="https://github.com/actions/typescript-action/workflows/build-test/badge.svg"></a>
</p>

# Create Flutter Test Report

## Usage

```yaml
- name: flutter test
  run: flutter test --machine > test.json
- name: flutter test
  run: flutter test --coverage
  if: success() || failure()
- uses: ueki-tomohiro/flutter-test-action@v1
  with:
    machinPath: test.json
    coveragePath: coverage/lcov.info
  if: success() || failure()
```
