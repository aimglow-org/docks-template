# verify-cc-session ツール設計書

## 概要

CC が conventions/ を読み込み済みかどうかを検証するバイナリツール。
conventions/ 内に埋め込まれたセッション検証キーを CC が引数として渡し、
バイナリが一致を確認する。

## 目的

- `/imp`, `/test`, `/rev` 実行時に conventions/ 読み込み済みかを高速判定する
- 読み込み済みなら数トークンで通過。未読なら読み込み指示を返す
- CC がソースコードからキーを推定することを防止する

## 仕組み

```
CC: conventions/ 読み込み済み
    → セッション検証キーを記憶している
    → verify-cc-session --key {キー} を実行
    → PASS → 本処理に進む

CC: conventions/ 未読 or コンテキスト圧縮で忘れた
    → キーがわからない or 間違ったキーを渡す
    → verify-cc-session --key {wrong} を実行
    → FAIL → conventions/ 読み込み指示が返る
```

## セキュリティ

- セッション検証キーは conventions/ の YAML 内に平文で記載する（CC が読む必要があるため）
- バイナリ内にも同じキーをハードコードする
- Go ソースはビルド後に削除する。git 履歴にも残さない
- バイナリのみをリポジトリにコミットする
- キーは一度決めたら変更しない（固定）

## ファイル構成

```
tools/verify-cc-session/
  ├── DESIGN.md                            ← この設計書
  ├── verify-cc-session                    ← シンボリックリンク（実行環境のバイナリを指す）
  ├── verify-cc-session-darwin-amd64       ← macOS Intel バイナリ
  ├── verify-cc-session-darwin-arm64       ← macOS Apple Silicon バイナリ
  ├── verify-cc-session-linux-amd64        ← Linux x86_64 バイナリ（CI / CC web）
  └── verify-cc-session-linux-arm64        ← Linux ARM64 バイナリ
```

## バイナリの仕様

### 使い方

```bash
./tools/verify-cc-session/verify-cc-session --key <session-verification-key>
```

### 出力

**成功時（exit code 0）:**
```
PASS: conventions/ loaded.
```

**失敗時（exit code 1）:**
```
FAIL: design.yaml を読み込んでください。
まず以下を読み込み、フェーズ別必読規約に従って追加ファイルを読んでください:
  - docs/conventions/design.yaml（必須 — 検証キー + フェーズ別必読規約）
```

**キー未指定時（exit code 1）:**
```
FAIL: --key オプションを指定してください。
```

## Go ソース仕様（ビルド用、ビルド後削除）

```go
package main

import (
    "flag"
    "fmt"
    "os"
)

const embeddedKey = "<ランダム生成した固定トークン>"

func main() {
    key := flag.String("key", "", "session verification key")
    flag.Parse()

    if *key == "" {
        fmt.Println("FAIL: --key オプションを指定してください。")
        os.Exit(1)
    }

    if *key != embeddedKey {
        fmt.Println("FAIL: design.yaml を読み込んでください。")
        fmt.Println("まず以下を読み込み、フェーズ別必読規約に従って追加ファイルを読んでください:")
        fmt.Println("  - docs/conventions/design.yaml（必須 — 検証キー + フェーズ別必読規約）")
        os.Exit(1)
    }

    fmt.Println("PASS: conventions/ loaded.")
}
```

## ビルド手順（/des が自動実行する）

```bash
# 1. 一時ディレクトリで作業
cd /tmp && mkdir verify-build && cd verify-build
go mod init verify-cc-session

# 2. トークン生成
TOKEN=$(openssl rand -hex 32)

# 3. main.go 生成（TOKEN を埋め込み）
# 4. マルチアーキテクチャビルド
CGO_ENABLED=0 GOOS=darwin GOARCH=amd64 go build -o verify-cc-session-darwin-amd64 main.go
CGO_ENABLED=0 GOOS=darwin GOARCH=arm64 go build -o verify-cc-session-darwin-arm64 main.go
CGO_ENABLED=0 GOOS=linux  GOARCH=amd64 go build -o verify-cc-session-linux-amd64  main.go
CGO_ENABLED=0 GOOS=linux  GOARCH=arm64 go build -o verify-cc-session-linux-arm64  main.go

# 5. バイナリをリポジトリにコピー
cp verify-cc-session-* /path/to/project/tools/verify-cc-session/

# 6. 実行環境に合わせたシンボリックリンク作成
# 7. design.yaml にトークンを書き込む
# 8. 一時ディレクトリを削除
cd /tmp && rm -rf verify-build
```

## /imp, /test, /rev への組み込み

各コマンドの前処理:

```
1. CC が記憶しているセッション検証キーを取得する
2. ./tools/verify-cc-session/verify-cc-session --key {キー} を実行する
3. PASS → 本処理に進む
4. FAIL → conventions/ 配下を全て読み込み、キーを記憶してから本処理に進む
```
