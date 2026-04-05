# docks-template

DDD/SDD/TDD Go monorepo template with Claude Code workflow (GCP).

## Quick Start

1. GitHub で "Use this template" → 新規リポジトリ作成
2. クローンして Claude Code を起動
3. `/des` を実行 → ヒアリング → CLAUDE.md, DESIGN.md, ドメイン設計を自動生成
4. `/imp` で開発サイクルに入る

## CC コマンド体系

| コマンド | 用途 |
|----------|------|
| `/des` | プロジェクト設計（新規立ち上げ時） |
| `/imp` | 実装フロー駆動（設計→実装→デプロイ） |
| `/test` | テスト駆動（テストデータ→テストコード→実行） |
| `/rev` | 並列Agentレビュー（設計/コード/テスト） |

## 設計三方針

- **DDD**（ドメイン駆動設計）: ドメインが中心。4層構成を省略しない
- **SDD**（スキーマ駆動設計）: インターフェースを先に書く。スキーマが契約の源泉
- **TDD**（テスト駆動開発）: テストデータ → テストコード → 実装コード の順

## 技術スタック

- Go / Nx monorepo / GCP (Cloud Run, CloudSQL, GCS) / Terraform / GitHub Actions

## 規約

`docs/conventions/` に8つの規約ファイルを配置。詳細はそちらを参照。

## License

Private
