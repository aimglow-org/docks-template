# /imp — 実装フロー駆動

実行フェーズ: $ARGUMENTS

## 概要

`docs/conventions/implementation.yaml` のルールに従い、指定されたフェーズの作業を実行する。
各フェーズは前のフェーズの成果物が存在することを前提とする。

## フェーズ一覧（引数）

| 引数 | フェーズ | 成果物 |
|---|---|---|
| （なし） | 自動推定 | 次にやるべきステップを自動実行 |
| `init` | 造船所セッション開始 | conventions/ 読み込み完了 |
| `basic-design {domain}` | 基本設計 | YAML ファイル群 |
| `detail-design {domain}` | 詳細設計 | detaildesign.md |
| `ui-design {domain}` | UI 設計 | Figma デザイン + Code Connect |
| `ui-mock {domain}` | Mock アプリ実装 | apps/mock-{project}-{framework}/ |
| `task {domain}` | 実装タスク作成 | .task/impl-{nnn}.prog.md |
| `code {domain} {task_number}` | コード実装 | Go ソースコード |
| `deploy` | デプロイ | Cloud Run サービス |

---

## 前処理（全フェーズ共通）

**どのフェーズを実行する場合でも、最初に以下を実行する:**

1. セッション検証キーを `./tools/verify-cc-session/verify-cc-session --key {キー}` に渡して実行する
2. PASS → conventions/ 読み込み済み。そのまま本処理に進む
3. FAIL → `docs/conventions/` 配下の規約ファイルをすべて読み込み、セッション検証キーを記憶してから本処理に進む

これにより conventions/ の不要な再読み込みを防ぎ、トークン消費を抑える。

---

## 自動推定ルール（引数なしの場合）

引数が空の場合、プロジェクトの状態から次にやるべきステップを自動判定する。

**判定ロジック（上から順に評価）:**

1. `.task/impl-*.prog.md` が存在する？
   → Yes: メタ情報を読み取り `/imp code {domain} {task_number}` を実行
   → No: 次へ

2. `.task/` ディレクトリに `.prog.md` がなく `.done.md` のみ + 全タスク完了？
   → Yes: `/imp deploy` を提案
   → No: 次へ

3. `detaildesign.md` が存在し、`.task/` が未作成？
   → Yes: UI 判定へ（ステップ 3a）
   → No: 次へ

3a. fn-*.yaml に ui セクション（画面仕様: 画面構成、インタラクション等）が存在する？
   → No（UI なし）: `/imp task {domain}` を実行
   → Yes: ui-design / ui-mock の完了状態を確認
     - fn-*.yaml に Figma 参照（ファイルキー）がない → `/imp ui-design {domain}`
     - Figma 参照はあるが Mock 未実装 or 未承認 → `/imp ui-mock {domain}`
     - 両方完了（承認済み）→ `/imp task {domain}` を実行

4. `docs/domains/{domain}/def.yaml` が存在する？
   → Yes: `/imp detail-design {domain}` を実行
   → No: 次へ

5. 上記すべて該当しない？
   → ユーザーに「どのドメインの basic-design を開始しますか？」と確認

**UI フェーズの判定方法:**
- fn-*.yaml に `画面構成` や `インタラクション` の記述がある → UI あり
- fn-*.yaml が MCP ツール定義のみ → UI なし（API/CLI 専用）
- 判断できない場合はユーザーに確認

**domain の自動特定:**
- `.task/*.prog.md` のパスから特定（例: `domains/{domain}/.task/` → {domain}）
- 複数ドメインの `.task/` がある場合は `.prog.md` があるドメインを優先
- 特定できない場合はユーザーに確認

---

## フェーズ詳細

### /imp init

**明示的に呼ぶ場合: conventions/ の内容を要約してユーザーに提示する。**

通常は前処理で暗黙的に実行されるため、明示呼び出しは不要。
新しいセッション開始時に規約内容を確認したい場合に使う。

1. 前処理で読み込んだ conventions/ の内容を要約してユーザーに提示する
2. 「どのドメインの作業を行いますか？」とユーザーに確認する

---

### /imp basic-design {domain}

**基本設計 YAML を作成する。**

1. `docs/domains/{domain}/` ディレクトリを確認する（なければ作成）
2. 既存の YAML ファイルがあれば読み込む
3. 以下のファイルを順に作成・更新する:
   - `def.yaml` — エンティティ、値オブジェクト、集約ルートの定義
   - `rule.yaml` — ビジネスルール、不変条件、状態遷移
   - `store.yaml` — CloudSQL テーブル設計、GCS バケット構成
   - `schema.yaml` — SQL DDL、インデックス定義
   - `ref.yaml` — ドメイン間参照（なければ「なし」と記載）
   - `fn-{機能名}.yaml` — 機能ごとに作成（interface, usecase, ui セクション）
4. 各ファイル作成後に即時コミットする
5. 完了後、`/rev basic-design` の実行を提案する

完了条件: 全 YAML ファイルが作成され、コミット済みであること。

YAML 要素記法:
- `i:` — 単一アイテム
- `c:` — 子要素を持つ親（children）
- `n:` — ノート（補足説明）

---

### /imp detail-design {domain}

**詳細設計を作成する。曖昧表現を排除し、実装を確定させる。**

前提条件: 基本設計 YAML が存在すること

1. `docs/domains/{domain}/` 配下の全 YAML を読み込む
2. `detaildesign.md` を作成する。以下を含める:
   - 実装スコープ（本フェーズで実装する機能 / しない機能を明記）
   - 非機能要件（認証、ログ、エラーハンドリング）
   - ディレクトリ構成（全ファイルパスを確定）
   - Go 型定義（define/ の全コード）
   - ユースケース実装（usecase/ の全コード）
   - platform 層の interface 定義
   - infrastructure 実装方針
   - entrypoint 実装方針
   - デプロイ設定
   - 依存ライブラリ（domain / platform / apps に分類）
   - テスト方針（テストケース一覧）
3. 曖昧チェック: 以下の表現が含まれていないか検証する
   - 「〜する予定」「〜かもしれない」「〜を検討」「必要に応じて」「おそらく」「など」
   - 見つかった場合は確定表現に書き換える
4. コミットする
5. 完了後、`/rev detail-design` の実行を提案する

完了条件: detaildesign.md が作成され、曖昧表現が 0 件であること。

---

### /imp ui-design {domain}

**fn-*.yaml の ui セクションから Figma デザインを生成する。**

前提条件: fn-*.yaml に ui セクションが存在すること。Figma MCP が接続されていること

1. `docs/domains/{domain}/` 配下の全 fn-*.yaml を読み込む
2. 各 fn-*.yaml の ui セクション（画面仕様）を解析する
3. Figma ファイルを作成する（create_new_file、または既存ファイルを使用）
4. 画面ごとに Figma デザインを生成する（use_figma）
   - コンポーネント単位で設計する
   - デザイントークン（色、spacing、typography）を定義する
   - search_design_system で既存コンポーネントを検索し、再利用する
5. Code Connect マッピングを設定する（add_code_connect_map）
6. Figma URL をユーザーに提示する
7. **設計者に検証を依頼する:**
   - 「Figma デザインを確認してください。設計の過不足・不整合があれば指摘してください」
   - 設計フィードバック → fn-*.yaml を修正 → ステップ 2 に戻る
   - **修正ループ終了条件: fn-*.yaml に変更がない状態で 1 回のレビューを通過したら完了**
8. **クライアントレビューを依頼する:**
   - 「Figma 上でコメントしてください」
   - コメント反映 → Figma 修正 → 再レビュー
9. デザイントークン（colors, spacing, typography）を token ファイルに同期する
10. Figma 承認後、コミットする（Code Connect マッピング情報 + token ファイル）

完了条件:
- Figma デザインが設計者・クライアントに承認されていること
- Code Connect マッピングが設定済み（Figma コンポーネント数 == マッピング数）
- デザイントークンが token ファイルに同期済み

---

### /imp ui-mock {domain}

**承認済み Figma デザインから Mock アプリを実装する。**

前提条件: Figma デザインが承認済みであること

1. Figma から get_design_context でデザイン情報を取得する
2. Mock アプリのディレクトリを作成する
   - Web: `apps/mock-{project}-next/`
   - Mobile: `apps/mock-{project}-flutter/`
3. Figma デザインをベースにコンポーネントを実装する
   - get_design_context の出力をプロジェクトのスタックに適応する
   - Code Connect マッピングに従い、既存コンポーネントを再利用する
4. 画面遷移・フォームバリデーション・ローディング等のインタラクションを実装する
5. 即時都度コミットする
6. **クライアントにハンズオンレビューを依頼する:**
   - 「Mock アプリを触って確認してください」
   - フィードバック → GitHub Issue（type:ui-review ラベル）で受け付ける
7. フィードバックを分類する:
   - ビジュアル乖離（色、サイズ）→ Figma に戻さず token 同期で修正
   - インタラクション不足 → Mock のみ修正
   - デザイン概念的な変更 → `/imp ui-design` に戻る（fn-*.yaml 修正が必要な場合のみ）
   - 承認 → 本実装に移行可能
8. コミットする

完了条件:
- クライアントのハンズオン承認が得られていること
- Figma デザインと Mock の見た目が一致していること
- フィードバック Issue が全て Resolved であること

---

### /imp task {domain}

**実装タスクを作成する。**

前提条件: detaildesign.md が存在すること

1. `docs/domains/{domain}/detaildesign.md` を読み込む
2. `.task/` ディレクトリを確認する（なければ作成）
3. 実装を以下の単位でタスクに分割する:
   - define/ 全体 → 1 タスク
   - usecase/ の各ユースケース → 各 1 タスク
   - infrastructure/ の各 Repository → 各 1 タスク
   - platform/ の各クライアント → 各 1 タスク
   - entrypoint/ → 1 タスク
   - main.go（DI 組み立て） → 1 タスク
4. 各タスクを `impl-{nnn}.prog.md` として作成する。
   テンプレートは `conventions/implementation.yaml` の「テンプレート（必須フィールド）」に従う。
   **必ず メタ情報（domain, layer, review）を正確に記載すること。**
   `/rev`（引数なし）はこのメタ情報から自動でレビュー種別を決定する。

5. タスク一覧をユーザーに提示する
6. コミットする

完了条件: 全タスクが .task/ に作成され、コミット済みであること。

---

### /imp code {domain} {task_number}

**指定されたタスクのコードを実装する。テストファーストで進める。**

前提条件: 該当の impl-{task_number}.prog.md が存在すること

1. `docs/conventions/` を読み込む（セッション中に未読の場合）
2. `docs/domains/{domain}/detaildesign.md` を読み込む
3. `.task/impl-{task_number}.prog.md` を読み込む
4. 依存タスクが完了済み（.done.md）か確認する。未完了なら警告する
5. **テストファースト — /test コマンドを順次実行する:**
   a. `/test design {domain} {layer}` を実行: testdata/*.yaml を作成
   b. `/test validate {domain} {layer}` を実行: 網羅性検証。error が 0 件になるまで修正
   c. `/test generate {domain} {layer}` を実行: テストコードを生成
   d. コミットする（テストは FAIL する状態で OK）
6. **実装コードを書く:**
   - detaildesign.md のコードをベースに実装する
   - conventions/ の規約に従う
   - 即時都度コミットする（小さく頻繁に）
7. `/test run {domain} {layer}` を実行: テストを全 PASS にする
8. タスクファイルの完了条件をチェックする
9. タスクファイルを `impl-{task_number}.done.md` にリネームする
10. 完了メモを記入する
11. コミットする
12. 該当レイヤーの `/rev impl-{layer}` の実行を提案する

**テストファーストの原則:**
- テストデータ（YAML）→ テストコード → 実装コード の順で書く
- テストが RED（失敗）の状態からスタートし、GREEN（成功）にする
- テスト PASS 後にリファクタリング（テストは通ったまま）

実装順序の制約:
- define/ → usecase/ → infrastructure/ → entrypoint/ の順で実装する
- interpoint/ は entrypoint/ と並行または後に実装する（ドメイン間通信がある場合のみ）
- usecase/dto/ は interpoint/ または gRPC 接続が必要になった時点で実装する
- platform/ は infrastructure/ より先に実装する
- 前の層のテストが通るまで次の層に進まない

**ドメイン実装セッションのスコープ制約:**
- libs/domains/{domain}/ 内の実装に集中する
- apps/ の main.go、docker-compose、seed データはスコープ外
- 引き渡し: entrypoint/ に register.go（ハンドラ登録関数）を作成し、Integration セッションで組み立てる
- 小規模（ドメイン1つ）の場合はこの制約を緩和してよい

---

### /imp deploy

**Cloud Run へのデプロイを実行する。**

前提条件: 全実装タスクが完了済みであること

1. `detaildesign.md` のデプロイ設定セクションを読み込む
2. 事前チェック:
   - 全テスト通過確認（`go test ./...`）
   - .task/ 配下に .prog.md が残っていないか確認
3. Dockerfile の確認・作成
4. デプロイコマンドを提示する（自動実行はしない。ユーザー確認後に実行）
5. `/rev deploy` の実行を提案する

完了条件: Cloud Run サービスが起動し、ヘルスチェックが通ること。

---

## 全体フロー図

```
/imp init
    ↓
/imp basic-design {domain}
    ↓
/rev basic-design              ← レビュー（任意だが推奨）
    ↓
/imp detail-design {domain}
    ↓
/rev detail-design             ← レビュー（任意だが推奨）
    ↓
/imp ui-design {domain}        ← Figma 生成 → 設計者検証 → クライアントレビュー
    ↓                             ※ UI なしの場合はスキップ
/imp ui-mock {domain}          ← Mock 実装 → ハンズオンレビュー → 承認
    ↓                             ※ UI なしの場合はスキップ
/imp task {domain}
    ↓
/imp code {domain} 001         ← define/（テストファースト: YAML→テスト→実装）
    ↓
/rev impl-define               ← レビュー
    ↓
/imp code {domain} 002         ← usecase（テストファースト）
/imp code {domain} 003
    ↓
/rev impl-usecase              ← レビュー
/rev test-design               ← テストデータレビュー
    ↓
/imp code {domain} 004         ← platform
    ↓
/imp code {domain} 005         ← infrastructure（テストファースト）
    ↓
/rev impl-infrastructure       ← レビュー
    ↓
/imp code {domain} 006         ← entrypoint（テストファースト）
    ↓
/rev impl-entrypoint           ← レビュー
    ↓
/imp code {domain} 007         ← interpoint（ドメイン間通信がある場合のみ）
    ↓
/rev impl-interpoint           ← レビュー（該当時のみ）
    ↓
/imp code {domain} 008         ← main.go / register.go
    ↓
    ↓
/test ci                       ← 全テスト実行
    ↓
/imp deploy
    ↓
/rev deploy                    ← レビュー
    ↓
/rev full                      ← 最終レビュー
```
