# {{PROJECT_NAME}} — 設計書

> `/des` コマンドで自動生成される。手動編集しないこと。

---

## 設計思想

<!-- /des Phase 3 で生成 -->

## データ配置

| 意味 | 配置先 |
|------|--------|
| 構造化された記録 | CloudSQL |
| ファイル・原本 | GCS |
| タスク・議論 | GitHub Issues |

## スコープ

<!-- /des Phase 3 で生成: ドメイン一覧と概要 -->

## アーキテクチャ

<!-- /des Phase 3 で生成: 技術スタック、通信方式 -->

## コンポーネント詳細

<!-- /des Phase 3 で生成: 各ドメインの概要 -->

## CloudSQL スキーマ設計

<!-- /imp basic-design で生成: schema.yaml の内容 -->

## GCS バケット構成

<!-- /imp basic-design で生成: store.yaml の内容 -->

## 実装フェーズ

<!-- /des Phase 3 で生成: フェーズ分割 -->

## 技術選定

| 項目 | 選定 | 理由 |
|------|------|------|
| バックエンド | Go | — |
| モノレポ | Nx | — |
| DB | CloudSQL (PostgreSQL) | — |
| ストレージ | GCS | — |
| IaC | Terraform | — |
| CI/CD | GitHub Actions | — |
