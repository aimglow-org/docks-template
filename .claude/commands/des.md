# /des — プロジェクト設計

設計対象: $ARGUMENTS

## 概要

新規プロジェクトまたは新規ドメインの要件定義と骨格生成を行う。
ユーザーへの質疑応答を通じて要件を確定し、DDD に則ったドメイン定義から設計をスタートする。

## サブコマンド一覧（引数）

| 引数 | 内容 | 成果物 |
|---|---|---|
| （なし） | 新規プロジェクトの要件定義 | DESIGN.md, CLAUDE.md, 骨格ディレクトリ |
| `domain {name}` | 新規ドメインの要件定義 | docs/domains/{name}/ YAML テンプレート |

---

## 前提知識（CC が常に把握しておくべき構造）

### Nx モノレポ構成

```
{project}/
  ├── .claude/commands/       ← CC コマンド（des, imp, test, rev）
  ├── docs/                   ← 設計書
  │   ├── DESIGN.md
  │   ├── conventions/        ← 規約
  │   └── domains/            ← ドメイン別設計
  ├── apps/                   ← デプロイ可能なアプリケーション
  ├── libs/
  │   ├── domains/            ← ドメインロジック（DDD bounded contexts）
  │   │   └── {domain}/backend-{tech}/
  │   │       ├── define/     ← 型・インターフェース（SDD 契約）
  │   │       ├── usecase/    ← ビジネスロジック
  │   │       ├── infrastructure/ ← 外部依存の実装
  │   │       └── entrypoint/ ← ハンドラ・公開API
  │   ├── platform/           ← 外部接続実体（{provider}-{service}-{lang}/）
  │   ├── shared/             ← 複数ドメインから参照される共通コード
  │   └── api-schema/         ← インターフェース定義（orphan branch から同期。必要時に作成）
  │       └── generated/      ← buf generate 結果（go/, dart/, ts/ 等）
  ├── tools/                  ← 開発支援ツール
  ├── infra/                  ← Terraform（IaC）
  │   ├── modules/            ← GCP リソーステンプレート
  │   └── environments/       ← 環境別設定（dev, stg, prod）
  ├── CLAUDE.md
  ├── nx.json
  ├── package.json
  └── go.work
```

### 設計三方針

- DDD（ドメイン駆動設計）: ドメインが中心。4層構成を省略しない
- SDD（スキーマ駆動設計）: インターフェースを先に書く。スキーマが契約の源泉
- TDD（テスト駆動開発）: テストデータ → テストコード → 実装コード の順

### バックエンド

- 言語: Go
- gRPC: buf + connect-go（ドメイン間通信）
- 命名: {分類名}-{名前}-{言語}（例: gcp-cloudsql-go, api-stripe-go）

---

## /des（引数なし）— 新規プロジェクト設計

**Phase 1: 要件ヒアリング**

以下のカテゴリについて順に質問する。ユーザーの回答に応じて後続の質問を分岐させる。

### 1. プロジェクト基本情報

- プロジェクト名は？
- 一言で何をするシステム？（エレベータピッチ）
- 誰のためのシステム？

### 2. ユーザーとアクセス

- 利用者は自分だけ？複数ユーザー？
  - 複数 → ユーザー登録が必要？招待制？
- 認証は必要？
  - Yes → Firebase Auth / Cloud Run IAM / Google OAuth / 独自認証？
- ロールによる権限制御が必要？
  - Yes → どのようなロール？（管理者 / 一般ユーザー / 閲覧者 等）

### 3. フロントエンド

- UI は必要？
  - No → CC 対話 or API のみ（MCP / CLI）
  - Yes → 以下を確認:
    - 全画面数はいくつ？（概算でよい）
    - OS 固有 API（カメラ, Bluetooth, HealthKit 等）を使う画面は何件？
    - 技術選定判定:
      - OS 固有 API 使用 0 件 → Next.js / PWA（優先度1）
      - OS 固有 API 使用が全画面の 30% 以下 + 両 OS 必要 → Flutter（優先度2）
      - OS 固有 API 使用が 30% 超、または片 OS のみ → Swift / Kotlin（優先度3）
    - 判定根拠（全画面数、OS 固有 API 使用画面数）を DESIGN.md に記録する
- Figma でデザインを管理する？
  - Yes（推奨）→ CC が Figma MCP でデザイン生成。Code Connect でコードとマッピング
  - No → Mock アプリのみで進行
- クライアントレビューの方法は？
  - Figma コメント（ビジュアルレビュー）
  - Mock アプリ ハンズオン（インタラクションレビュー）
  - 両方（推奨）

### 4. バックエンド・API

- MCP Server として CC から使う？
  - Yes → Streamable HTTP（Cloud Run）
- REST API / gRPC API を外部に公開する？
  - Yes → orphan branch `api-schema` の `proto/` で定義
- ドメイン間通信は必要？
  - Yes → orphan branch `api-schema` の `proto-internal/` で定義

### 5. データ

- データベースは必要？
  - Yes → CloudSQL (PostgreSQL) / Firestore / その他？
- ファイルストレージは必要？
  - Yes → GCS / その他？
- リアルタイム性は必要？
  - Yes → WebSocket / SSE / Pub/Sub？

### 6. ドメイン定義（DDD）

- このシステムの業務領域（ドメイン）を列挙してください
- 各ドメインの一言説明
- ドメイン間の依存関係はある？

### 7. 外部連携

- 外部 API 連携はある？
  - Yes → 列挙（OpenAI, Stripe, SendGrid 等）
  - 各 API の用途

### 8. インフラ・デプロイ

- デプロイ先は？（Cloud Run / Cloud Functions / Vercel / その他）
- CI/CD は？（GitHub Actions / その他）
- 環境分離は？（dev / staging / prod）

### 9. 非機能要件

- セキュリティ上の特記事項は？（個人情報、決済情報、法令対応 等）
- パフォーマンス要件は？（同時接続数、レスポンスタイム 等）
- 可用性要件は？（SLA 等）

**Phase 2: 要件確認**

質疑応答の結果を一覧で提示し、ユーザーに確認する。
修正があれば反映する。

**Phase 3: 骨格生成**

確定した要件に基づき、以下を自動生成する。

1. CLAUDE.md — プロジェクト固有の CC 規約
2. docs/DESIGN.md — 全体設計書（要件サマリー、アーキテクチャ図、技術スタック）
3. docs/conventions/ — 規約ファイル群（テンプレートから配置、要件に応じてカスタマイズ）
   - design.yaml（技術スタック、4層構成ルールを要件に合わせて調整）
   - coding.yaml, naming.yaml, implementation.yaml, testing.yaml,
     test-coverage.yaml, review.yaml, escalation.yaml
4. docs/domains/{domain}/ — 各ドメインの空 YAML テンプレート
   - def.yaml, rule.yaml, store.yaml, ref.yaml, schema.yaml（空テンプレート）
5. ディレクトリ骨格
   - apps/（要件に応じた apps を作成。UI ありの場合は apps/mock-{project}-next/ or flutter/ も作成）
   - libs/domains/{domain}/backend-{tech}/{define,usecase,infrastructure,entrypoint}/（空ディレクトリ）
   - libs/platform/（要件に応じた platform パッケージ名でディレクトリ作成）
   - libs/shared/（test-runner-go/ 等）
   - libs/api-schema/（orphan branch から同期。初期は空ディレクトリ + .gitkeep）
   - infra/modules/, infra/environments/{dev,stg,prod}/
   - tools/
6. nx.json, package.json, go.work のテンプレート
7. verify-cc-session バイナリのビルドと配置
   a. /tmp/ にてランダムな SHA-256 トークンを生成する（`openssl rand -hex 32`）
   b. トークンを埋め込んだ Go ソースコードを /tmp/verify-cc-session/ に生成する
   c. マルチアーキテクチャ・マルチプラットフォームでクロスビルドする:
      - `GOOS=darwin GOARCH=amd64`
      - `GOOS=darwin GOARCH=arm64`
      - `GOOS=linux GOARCH=amd64`
      - `GOOS=linux GOARCH=arm64`
   d. ビルド成果物を `tools/verify-cc-session/` に配置する（バイナリ名: `verify-cc-session-{os}-{arch}`）
   e. 実行環境に合わせたシンボリックリンク `tools/verify-cc-session/verify-cc-session` を作成する
   f. 発行したトークンを `docs/conventions/design.yaml` のセッション検証キーに書き込む
   g. /tmp/verify-cc-session/ を削除する

生成後、コミットする。

**Phase 4: 次のステップ提案**

```
/des 完了。以下の順で進めてください:
1. /imp basic-design {最初のドメイン} — 最初のドメインの基本設計
2. /imp detail-design {ドメイン} — 詳細設計
3. /imp task {ドメイン} — タスク分割
4. /imp code {ドメイン} 001 — 実装開始
```

---

## /des domain {name} — 新規ドメイン追加

既存プロジェクトに新しいドメインを追加する。

**Phase 1: ドメインヒアリング**

- ドメイン名（英語小文字・単数形）
- このドメインは何を扱う？（一言説明）
- 主要なエンティティは？（列挙）
- 既存ドメインとの依存関係は？
- どの MCP ツール / API エンドポイントが必要？
- データストアの要件は？（DB テーブル、ファイル保存 等）

**Phase 2: 骨格生成**

1. docs/domains/{name}/ に空 YAML テンプレートを生成
   - def.yaml — ドメイン概要 + エンティティ列挙（ヒアリング結果から）
   - rule.yaml, store.yaml, ref.yaml, schema.yaml（空テンプレート）
2. libs/domains/{name}/backend-{tech}/{define,usecase,infrastructure,entrypoint}/ を作成
3. コミットする

**Phase 3: 次のステップ提案**

```
/imp basic-design {name} — 基本設計に進んでください
```
