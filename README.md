<p align="center">
  <a href="https://github.com/actions/typescript-action/actions"><img alt="typescript-action status" src="https://github.com/actions/typescript-action/workflows/build-test/badge.svg"></a>
</p>

# Create Flutter Test Report

## Usage

```yaml
- name: flutter test
  run: flutter test --machine > test.json
- uses: ueki-tomohiro/flutter-result-tool@main
  with:
    inputPath: test.json
    outputPath: test.xml
  if: success() || failure()
```
