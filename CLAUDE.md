# CLAUDE.md

## 概要

Flutter のテスト結果とカバレッジから GitHub の Check Run と PR コメントを作成する、TypeScript 製の GitHub Action。

- エントリポイントは `action.yml` → `dist/index.js`（`node24`）
- 入力: `machinePath`（`flutter test --machine` の JSON lines）と `coveragePath`（`lcov.info`）。少なくとも一方が必須。他に `title`、`coverageThreshold`（既定値 80）、`token`
- 出力: Check Run、PR コメント（marker `<!-- flutter-test-action-comment -->` で既存コメントを更新）、`GITHUB_STEP_SUMMARY`、action outputs（`conclusion`、`tests`、`passed`、`failed`、`coverage` など）

## コマンド

Node 24.14.0 / pnpm 10.32.1 は `mise.toml` で固定している。

```sh
pnpm install
pnpm build          # tsc → lib/
pnpm test           # vitest run
pnpm lint           # oxlint --type-aware
pnpm format         # oxfmt --write（確認だけなら format-check）
pnpm package        # ncc で dist/ を再生成
pnpm all            # build → format → lint → package → test

# 単一テストの実行
pnpm vitest run __tests__/parser.test.ts -t "<test name>"
```

## アーキテクチャ

- `src/main.ts`: 入力の検証（`coverageThreshold` は 0〜100）、`Parser` と `CoverageParser` の実行、`exportReport` の呼び出し
- `src/parser.ts`: machine 出力を 1 行ずつ JSON として解釈し、`TestSuite` / group / test を組み立てて `Reporter` に変換する
- `src/coverage.ts`: `lcov-parse` の結果を `Coverage` に変換し、閾値と比べて `Reporter` に変換する
- `src/formatter.ts` の `exportReport`: テストとカバレッジの `Reporter` を結合し、65535 文字・アノテーション 50 件の上限で切り詰める。その後 outputs と step summary を書き、`token` がある場合は PR コメントの作成・更新と `checks.create` を行う
- `src/model/`: `*FromJSON` 関数で変換するモデル群と、共通の結果型 `Reporter`
- テストは `__tests__/`、フィクスチャは `__tests__/data/`

## 注意点

- `dist/` はコミット対象。`src/` を変更したら `pnpm package` を実行し、`dist/` の差分もコミットする（`check-dist.yml` が差分を検出すると CI が失敗する）
- `@actions/core` と `@actions/github` は ESM-only のため、`await import()` で動的に読み込む（`tsconfig.json` は `module: node16` で CommonJS を出力する）。トップレベルで静的 import しないこと。テストでは `vi.resetModules()` と動的モックを使う
- `lcov-parse` は `require` で読み込んでいる
- lefthook により、pre-commit で oxfmt と oxlint、pre-push で `pnpm test` が実行される
- `.github/workflows/` の変更は actionlint と zizmor（`workflow-quality.yml`）でチェックされる
- CI の `test` ジョブは `uses: ./` で、`__tests__/data/` のフィクスチャを入力にして action 自体を実行する
