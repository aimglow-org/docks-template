# CLAUDE.md — {{PROJECT_NAME}} 規約

> この文書は、CC（Claude Code）セッションが本リポジトリで作業する際の規約を定める。
> すべてのCCセッションはこの文書に従うこと。
>
> **このファイルは `/des` コマンドで自動生成・更新される。**

---

# 造船所コンテキスト

> 以下はすべてプロジェクトルート配下の技術実装に関する規約。

## 作業開始の必須手順

**造船所セッション開始時、以下を必ず実行すること:**

1. `docs/conventions/` 配下の規約ファイルをすべて読み込む
2. 関連するドメインの設計書（`docs/domains/{domain}/`）を読み込む
3. 該当する `.task/impl-*.prog.md` を確認し、作業対象を把握する
4. 上記を踏まえてプランを立ててから着手する

## タスク管理

### GitHub Issues

- 方針決定、バグ報告、セッション横断の議題に使用
- Issue には適切なラベルを付与すること

### 実装タスク（.task/）

- **実装タスクは Issue 不要。** `docs/domains/{domain}/.task/` で管理する
- `impl-{nnn}.prog.md` — 進行中
- `impl-{nnn}.done.md` — 完了（ファイル名のステータスを変更）

### ラベル体系

<!-- /des で自動生成される -->

| ラベル | 用途 |
|--------|------|
| `type:feature` | 新機能の実装 |
| `type:bug` | バグ修正 |
| `type:design` | 設計・アーキテクチャ |
| `type:ui-review` | UI レビューフィードバック |
| `type:infra` | インフラ・環境構築 |

## ブランチ戦略

```
develop              ← 開発の主流ブランチ
  └── feature/*      ← 機能ブランチ（Issue単位）
```

1. **`develop`** が開発の主流。直接コミットしない
2. **`feature/{issue番号}-{概要}`** で機能ブランチを切る
3. feature ブランチでは **即時都度コミット** する（小さく頻繁に）
4. `develop` へのマージは **スカッシュマージ** すること
5. マージ後、feature ブランチは削除する

## 設計フロー

```
1. conventions/          規約を読む（必須）
       ↓
2. docs/domains/{d}/     基本設計（YAML）を書く
   ├── def.yaml             定義（エンティティ、値オブジェクト）
   ├── rule.yaml             ビジネスルール（BE/FE 共通）
   ├── store.yaml            データストア設計
   ├── ref.yaml              ドメイン間参照
   ├── schema.yaml           スキーマ定義
   ├── fn-{機能名}.yaml     機能仕様（interface, usecase, ui）
   ├── fe-def.yaml           FE 定義（コンポーネント、API ラッパー）
   └── fe-state.yaml         FE 状態設計（サーバー状態、クライアント状態）
       ↓
3. detaildesign-be.md    BE 詳細設計（曖昧排除、実装確定）
   detaildesign-fe.md    FE 詳細設計
       ↓
4. .task/impl-{nnn}      実装タスク作成
       ↓
5. libs/domains/{d}/     コード実装
   ├── backend-{tech}/       BE 4+α層構成
   └── frontend-{tech}/     FE 3層構成
```

### YAML 要素記法（Workflowy 互換）

- `i:` — アイテム（全要素の基本。親も子もすべて `i:` で始まる）
- `c:` — 子要素リスト（`i:` の下にネストする子の配列）
- `n:` — ノート（補足説明）

```yaml
# 記法例
- i: "親アイテム"
  n: "補足説明"
  c:
    - i: "子アイテム"
    - i: "子アイテム2"
      c:
        - i: "孫アイテム"
```

## アーキテクチャ（プロジェクトルート）

**この構成は絶対規約。小規模でもこの構成に則る。**

```
{project}/                              ← プロジェクトルート（Nx モノレポ）
  ├── docs/                             ← 設計書
  │   ├── DESIGN.md                        全体設計
  │   ├── conventions/                     規約
  │   │   ├── design.yaml                    設計方針（DDD/SDD/TDD、4層構成、アーキテクチャ）
  │   │   ├── coding.yaml                    Go コーディングスタイル
  │   │   ├── naming.yaml                    命名規約
  │   │   ├── implementation.yaml            実装フロー、タスク管理
  │   │   ├── testing.yaml                   テスト規約
  │   │   ├── test-coverage.yaml             カバレッジチェックリスト
  │   │   ├── review.yaml                    レビュー規約（ロール、Agent構成）
  │   │   └── escalation.yaml                エスカレーション規約
  │   ├── domains/                         ドメイン別設計
  │   │   └── {domain}/
  │   │       ├── def.yaml                    BE 定義（エンティティ、VO、契約）
  │   │       ├── rule.yaml                    ビジネスルール（BE/FE 共通）
  │   │       ├── store.yaml                   データストア設計
  │   │       ├── ref.yaml                     ドメイン間参照
  │   │       ├── schema.yaml                  スキーマ定義
  │   │       ├── fn-{機能名}.yaml            機能仕様（interface, usecase, ui）
  │   │       ├── detaildesign-be.md            BE 詳細設計
  │   │       ├── fe-def.yaml                  FE 定義（コンポーネント、API ラッパー）
  │   │       ├── fe-state.yaml                FE 状態設計
  │   │       ├── detaildesign-fe.md            FE 詳細設計
  │   │       └── .task/
  │   │           ├── impl-001.prog.md
  │   │           └── impl-002.done.md
  │   └── shared/                          shared ライブラリ設計
  │       ├── {分類名}-{名前}-{言語}/
  │       │   ├── def.yaml                 interface 定義（SDD 契約）
  │       │   ├── spec.yaml                パッケージ別仕様
  │       │   └── detaildesign.md
  │       └── design-system-{tech}/        FE Design System 設計
  │           ├── def.yaml                 トークン定義・コンポーネント契約
  │           ├── spec.yaml                コンポーネントカタログ
  │           └── detaildesign.md
  │
  ├── apps/
  │   └── {app-name}/                   ← Go: デプロイ可能アプリケーション
  │
  ├── libs/
  │   ├── domains/                      ← ドメインロジック（bounded contexts）
  │   │   └── {domain}/
  │   │       ├── backend-{tech}/        ← BE 4+α層（Go の場合 backend-go/）
  │   │       │   ├── define/           ← 型定義・インターフェース（契約）
  │   │       │   ├── usecase/          ← ビジネスロジック
  │   │       │   │   └── dto/          ← Proto ↔ Domain 変換（必要時）
  │   │       │   ├── infrastructure/   ← 外部依存の実装（repository 等）
  │   │       │   ├── entrypoint/       ← ハンドラ・公開API（FE向け、Bearer token）
  │   │       │   └── interpoint/       ← サービス間内部API（mTLS、必要時のみ）
  │   │       └── frontend-{tech}/      ← FE ドメイン層（動的アプリで使用）
  │   │           ├── components/       ← ドメイン固有コンポーネント
  │   │           ├── state/            ← 状態管理（hooks/, stores/）
  │   │           └── api/              ← api-schema generated/ のラッパー
  │   │
  │   ├── platform/                     ← 外部接続実体（GCP, 外部API）
  │   │   ├── gcp-cloudsql-go/          ← CloudSQL クライアント
  │   │   ├── gcp-cloudstorage-go/      ← GCS クライアント
  │   │   └── api-{name}-go/           ← 各種外部API クライアント
  │   │
  │   ├── shared/                       ← 複数ドメインから参照される共通コード
  │   │   ├── test-runner-go/          ← テスト基盤（YAML ローダー、validator、モック）
  │   │   └── design-system-{tech}/    ← FE Design System（tokens, primitives, composites, layouts）
  │   │
  │   └── api-schema/                   ← インターフェース定義（orphan branch から同期）
  │       └── generated/                ← buf generate 結果（go/, dart/, ts/ 等）
  │
  ├── tools/
  │   └── hooks/                        ← CC Hooks スクリプト（将来）
  │
  ├── infra/                            ← Terraform（IaC）
  │   ├── modules/                      ← GCP リソーステンプレート
  │   │   ├── cloud-run/
  │   │   ├── cloudsql/
  │   │   ├── gcs/
  │   │   └── secret-manager/
  │   └── environments/                 ← 環境別設定
  │       ├── dev/
  │       ├── stg/
  │       └── prod/
  │
  ├── nx.json
  ├── package.json
  └── go.work
```

### ドメイン内部の4+α層構成（DDD/SDD）

**すべてのドメインは以下の基本4層で構成する。例外なし。interpoint/ はドメイン間通信が必要な場合のみ追加。**

```
libs/domains/{domain}/backend-{tech}/
  ├── define/           ← 型・インターフェース定義（契約）
  │                        他の層はすべてこの定義に依存する。proto を import しない
  ├── usecase/          ← ビジネスロジック（define に依存）
  │   └── dto/          ← Proto ↔ Domain 変換（gRPC 接続時のみ）
  ├── infrastructure/   ← 外部依存の実装（define のインターフェースを実装）
  │                        platform/ パッケージを利用する。PII 暗号化もここ
  ├── entrypoint/       ← FE向けハンドラ（Bearer token）
  │                        MCP ツールハンドラ等がここに位置する
  └── interpoint/       ← サービス間内部API（mTLS、必要時のみ追加）
```

**依存の方向:** `entrypoint/interpoint → usecase → define ← infrastructure`

### FE 3層構成

**動的アプリは以下の3層で構成する。静的サイトの場合 Layer 2 は省略可。**

```
Layer 1: Design System（全ドメイン共通）
libs/shared/design-system-{tech}/
  ├── tokens/           ← Figma 同期のデザイントークン
  ├── primitives/       ← 最小単位の UI 部品（Button, Input, Icon）
  ├── composites/       ← 複合部品（Form, Card, Modal, DataTable）
  └── layouts/          ← レイアウトパターン（Sidebar, Stack, Grid）

Layer 2: Domain FE（ドメイン固有）
libs/domains/{domain}/frontend-{tech}/
  ├── components/       ← ドメイン固有コンポーネント
  ├── state/            ← 状態管理（hooks/, stores/）
  └── api/              ← api-schema generated/ のドメインラッパー

Layer 3: App（画面合成・デプロイ単位）
apps/{app-name}/
  ├── app/              ← ルーティング・画面合成（page は合成のみ）
  ├── providers/        ← グローバルプロバイダー
  └── config/           ← 環境設定
```

**依存の方向:** `App (pages/) → Domain FE (components/, state/) → Design System (tokens/, primitives/)`

- **fn 単位での FE 分割は禁止。** 同一ドメイン内の fn は同じ状態を共有するため、domain 境界が責務境界
- **{tech}** は `next`（Next.js）、`flutter`（Flutter）等。技術スタック単位で分割
- **詳細**: `docs/conventions/design.yaml` の「FE レイヤー構成」セクションを参照

### 通信方式

- **CC → MCP Server**: Streamable HTTP（Cloud Run 上の MCP Server に直接接続）（オプション）
- **ドメイン間通信**: gRPC（orphan branch `api-schema` の `proto-internal/` で定義）
- **外部公開 API**: gRPC（orphan branch `api-schema` の `proto/` で定義）
- **proto 管理**: buf + connect-go
- **バックエンド実行環境**: Cloud Run

### api-schema（orphan branch 方式）

proto 定義と生成コードを FE/BE 間で共有するための仕組み。
**UI-BE 接続またはドメイン間通信が必要になった時点で作成する。不要な段階では作成しない。**

- **orphan branch `api-schema`**: proto 定義（`proto/`, `proto-internal/`）+ 生成物（`generated/`）の単一ソース
- **生成物**: `generated/` 配下に言語別出力（`go/`, `dart/`, `ts/` 等）
- **同期**: `npm run api-schema:sync` で orphan → feature にコピー
- **詳細**: `docs/conventions/design.yaml` の「api-schema 運用」セクションを参照

### FE 設計・UI レビュー運用

**UI レビューは人間が行う。CC はデザイン生成と修正反映を担う。**

- **Figma**: ビジュアルの single source of truth。CC が Figma MCP で作成・更新
- **Code Connect**: Figma コンポーネント ↔ コードのマッピング。乖離防止の要
- **Mock アプリ**: インタラクション確認用
- **FE 技術選定**: Next.js（デフォルト）→ Flutter（両OS + OS固有30%以下）→ Swift/Kotlin（OS固有30%超）
- **Design System → Domain FE → App** の3層に沿って実装する
- **詳細**: `docs/conventions/design.yaml` の「FE 設計・UI レビュー運用」「FE レイヤー構成」セクションを参照

## コーディング規約

| 項目 | 選定 |
|------|------|
| バックエンド言語 | Go |
| モノレポ | Nx |
| DB | CloudSQL (PostgreSQL) |
| DB スキーマ管理 | Atlas |
| ストレージ | GCS |
| gRPC | buf + connect-go |
| IaC | Terraform |
| デザイン | Figma + Code Connect |
| FE（Web） | Next.js / PWA |
| FE（Mobile） | Flutter or Swift/Kotlin |
| CI/CD | GitHub Actions |

### 原則

- DDD / SDD / TDD の三方針を基本とする
- YAGNI: 必要になるまで作らない
- ドメインロジックは `libs/domains/` の `define/` + `usecase/` に閉じる。platform の詳細に依存しない
- インターフェース（define/）を先に書き、実装はそれに従う
- proto 定義を先に書き、実装はそれに従う
- テストは各 lib 単位で書く
- **小規模でも4層構成を省略しない**
- **詳細は `docs/conventions/` を参照すること**

## コミットメッセージ規約

```
<type>(<scope>): <summary>

<body（任意）>

Refs: #<issue番号>
```

| type | 用途 |
|------|------|
| feat | 新機能 |
| fix | バグ修正 |
| docs | ドキュメント |
| refactor | リファクタリング |
| chore | 雑務（設定変更など） |
| test | テスト追加・修正 |

## セッション運用

- 作業開始時、conventions/ と関連ドメイン設計書を読み込んでから着手する
- 迷ったら設計に戻る（実装中に方針判断しない）
- 気になったことは Issue に投げる
