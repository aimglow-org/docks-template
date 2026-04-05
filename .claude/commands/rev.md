# /rev — 並列Agentレビュー

レビュー種別: $ARGUMENTS

## 前処理

1. `./tools/verify-cc-session/verify-cc-session --key {セッション検証キー}` を実行する
2. PASS → 本処理に進む
3. FAIL → conventions/ を全て読み込み、キーを記憶してから本処理に進む

## 手順

1. `docs/conventions/review.yaml` を読み込む（前処理で読み込み済みの場合はスキップ）
2. 引数で指定されたレビュー種別を特定する（引数なしの場合は自動判定ルールに従う）
3. 該当するAgent構成に従い、Opus Agent を並列起動する
4. 各 Agent の結果を統合し、severity 別に整理して報告する

## レビュー種別（引数）

指定可能な値:

- `basic-design` — 基本設計レビュー（def.yaml, rule.yaml, fn-*.yaml 等）
- `detail-design` — 詳細設計レビュー（detaildesign.md）
- `impl-define` — define/ 実装レビュー
- `impl-usecase` — usecase/ 実装レビュー
- `impl-infrastructure` — infrastructure/ 実装レビュー
- `impl-entrypoint` — entrypoint/ 実装レビュー
- `impl-interpoint` — interpoint/ 実装レビュー（ドメイン間通信）
- `impl-platform` — platform/ 実装レビュー
- `impl-shared` — shared/ 実装レビュー（test-runner-go 以外）
- `test-design` — テストデータ（testdata/*.yaml）レビュー
- `test-code` — テストコード（*_test.go）レビュー
- `test-runner` — テストランナー（testutil/）レビュー
- `deploy` — デプロイ・インフラレビュー
- `cross-domain` — ドメイン横断レビュー
- `full` — フルレビュー（全ロール）

引数が空の場合は、変更されたファイルのパスからレビュー種別を自動判定する。

## 実行方法

review.yaml の該当レビュー種別から Agent 構成を読み取り、以下を実行する:

### Agent 起動

各ロールごとに Agent を並列起動する。Agent のプロンプトには以下を含める:

```
あなたは {ロール名} として、以下の変更をレビューしてください。

## あなたのロール
{review.yaml のロール定義から該当ロールの観点を記載}

## 必読ソース（必ず読み込んでからレビューすること）
{review.yaml のロール定義の「必読ソース」から該当ファイルを列挙}
※ 必読ソースを読まずにレビューしない。全ファイルを読み込んでから指摘を行うこと。

## レビュー対象
{変更されたファイルの一覧とその内容}

## 出力形式
以下の形式で指摘事項を返してください:

### {ロール名} レビュー結果

#### Critical（必ず修正）
- [ファイルパス:行番号] 指摘内容 → 改善案

#### Warning（検討推奨）
- [ファイルパス:行番号] 指摘内容 → 改善案

#### Info（参考情報）
- 指摘内容

指摘がない場合は「指摘なし」と記載してください。
```

### 事前チェック（Agent 起動前に実施）

1. **grep 残骸チェック**: リネームが含まれる変更の場合、旧名称の残骸がないか grep で確認する
   - 対象: コメント、テストデータ YAML、設計書 Markdown、変数名
   - 残骸が見つかった場合はレビュー前に修正する
2. **ALN（3層同期）チ���ック**: テスト関連の変更がある場合、test.spec.md ↔ testdata/*.yaml ↔ *_test.go の整合性を確認する
   - test.spec.md のケースが YAML に反映されているか
   - YAML のケースがテストコードで実行されているか

### 結果統合

全 Agent の結果を受け取り、以下の形式で統合して報告する:

```
## レビュー結果サマリー

- Critical: N 件
- Warning: N 件
- Info: N 件

### Critical（必ず修正）
- [{ロール名}] [ファイルパス:行番号] 指摘内容 → 改善案
...

### Warning（検討推奨）
...

### Info（参考情報）
...
```

Critical が 0 件になるまで修正→再レビューを繰り返す。

## 自動判定ルール（引数なしで /rev を実行した場合）

**優先度1: .task/ の進行中タスクから判定する（最も確実）**

1. `docs/domains/*/.task/impl-*.prog.md` と `docs/shared/*/.task/impl-*.prog.md` を検索する
2. 見つかった `.prog.md` のメタ情報を読み込む:
   ```
   ## メタ情報（scope=domain の例）
   - scope: domain
   - domain: {domain-name}
   - layer: usecase
   - review: impl-usecase

   ## メタ情報（scope=shared の例）
   - scope: shared
   - package: test-runner-go
   - review: test-runner
   ```
3. `review` フィールドの値をレビュー種別として使用する
4. scope=domain なら `domain` フィールドでレビュー対象ドメインを特定する
5. scope=platform|shared なら `package` フィールドでレビュー対象パッケージを特定する
6. 複数の `.prog.md` がある場合は、最も番号が大きい（最新の）タスクを優先する

**優先度2: git diff から判定する（.prog.md がない場合のフォールバック）**

`git diff --name-only` の結果から種別を判定する:

| ファイルパスのパターン | レビュー種別 |
|---|---|
| `docs/domains/*/def.yaml`, `rule.yaml`, `fn-*.yaml` 等 | `basic-design` |
| `docs/domains/*/detaildesign.md` | `detail-design` |
| `libs/domains/*/backend/define/` | `impl-define` |
| `libs/domains/*/backend/usecase/` | `impl-usecase` |
| `libs/domains/*/backend/infrastructure/` | `impl-infrastructure` |
| `libs/domains/*/backend/entrypoint/` | `impl-entrypoint` |
| `libs/domains/*/backend/interpoint/` | `impl-interpoint` |
| `libs/platform/` | `impl-platform` |
| `libs/shared/`（test-runner-go 以外） | `impl-shared` |
| `*/testdata/*.yaml` | `test-design` |
| `*_test.go`（testutil/ 以外） | `test-code` |
| `libs/shared/test-runner-go/` | `test-runner` |
| `Dockerfile`, `*.yaml`（deploy系） | `deploy` |
| 複数ドメインに跨る変更 | `cross-domain` |

**優先度3: git log から判定する（diff もない場合）**

直近のコミットメッセージの scope から種別を推定する。

**判定不能の場合:**
ユーザーに「どのレビューを実行しますか？」と確認する。

複数種別に該当する場合は、それぞれの種別を順次実行する。
