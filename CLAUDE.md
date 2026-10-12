# CLAUDE.md

## 概要

`flutter test --machine` を実行し、その結果とカバレッジから GitHub の Check Run、PR コメント、アノテーション、`GITHUB_STEP_SUMMARY` を作る、TypeScript 製の GitHub Action（v2）。

- エントリポイントは `action.yml` → `dist/index.js`（`node24`）
- 既定ではテストを実行する。`machinePath` / `coveragePath` を渡したときは実行せず、そのファイルを報告する
- 主な入力: `workingDirectory`、`testArgs`、`flutterCommand`、`coverage`、`coverageThreshold` / `changedLinesCoverageThreshold`（空なら報告だけ）、`failOnError`（既定 true）、`title`、`token`
- PR コメントは `<!-- flutter-test-action:<title> -->` で始まり、同じ title のコメントを更新する

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

解析と描画を分けている。

- `src/main.ts`: 入力の検証 → `runFlutterTest` → 解析 → PR の変更行の取得 → `buildReport` → outputs、step summary、Check Run、コメント → `setFailed`
- `src/runner.ts`: `@actions/exec` で `flutter test --machine` を実行し、JSON の行だけをファイルに書き出す。子プロセスの env から `INPUT_*` と runner の資格情報を除く
- `src/parser.ts`: machine 出力を `TestRun`（`src/model/test-run.ts`）に変換する。state は `testDone` だけで決め、error / print はテストごとに蓄積する。`loading ...` の失敗は suite の `loadErrors` になる
- `src/coverage.ts`: `lcov-parse` の結果を `CoverageData`（行ごとのヒット数を含む）に変換する
- `src/diff.ts`: PR の patch から追加行を求め、lcov と突き合わせて変更行カバレッジを計算する
- `src/paths.ts`: `file://` や絶対パス、lcov の相対パスを repo からの相対パスに変換する（`GITHUB_WORKSPACE` 基準）
- `src/report/`: `build.ts` で集計し、`markdown.ts` でコメント / Check Run / step summary を、`annotations.ts` でアノテーションを作る。文字数の上限（`outputLimit`）を超える節は優先度の低い順に落とす
- `src/github.ts`: Check Run の作成（アノテーションは 50 件ずつ `checks.update`）、コメントの upsert、PR の変更ファイルの取得
- テストは `__tests__/`、フィクスチャは `__tests__/data/`。描画結果は `__tests__/__snapshots__/*.md` のスナップショットで確認する（更新は `pnpm vitest run -u`）

## 注意点

- `dist/` はコミット対象。`src/` を変更したら `pnpm package` を実行し、`dist/` の差分もコミットする（`check-dist.yml` が差分を検出すると CI が失敗する）
- `@actions/core` と `@actions/github` は ESM-only のため、`await import()` で動的に読み込む（`tsconfig.json` は `module: node16` で CommonJS を出力する）。トップレベルで静的 import しないこと。テストでは `vi.resetModules()` と動的モックを使う
- `lcov-parse` は `require` で読み込んでいる
- lefthook により、pre-commit で oxfmt と oxlint、pre-push で `pnpm test` が実行される
- `.github/workflows/` の変更は actionlint と zizmor（`workflow-quality.yml`）でチェックされる
- CI の `test` ジョブは `uses: ./` で action 自体を実行する。Flutter SDK は使わず、`flutterCommand: bash __tests__/data/fake-flutter.sh` でフィクスチャを machine 出力として流す
