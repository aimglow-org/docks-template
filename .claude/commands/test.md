# /test — テスト駆動

テスト対象: $ARGUMENTS

## 概要

`docs/conventions/testing.yaml` のルールに従い、テストデータ作成・テストコード生成・テスト実行を行う。
テストファーストの原則に基づき、実装コードの前にテストを完成させる。

## 前処理

1. `./tools/verify-cc-session/verify-cc-session --key {セッション検証キー}` を実行する
2. PASS → 本処理に進む
3. FAIL → conventions/ を全て読み込み、キーを記憶してから本処理に進む

## サブコマンド一覧（引数）

### BE テスト

| 引数 | 内容 | 成果物 |
|---|---|---|
| （なし） | 自動推定 | 次にやるべきテストステップを自動実行 |
| `design {domain} {layer}` | BE テストデータ YAML 作成 | testdata/*.yaml |
| `validate {domain} {layer}` | BE テスト定義の網羅性検証 | validation 結果 |
| `generate {domain} {layer}` | BE テストコード生成 | *_test.go |
| `run {domain} {layer}` | BE テスト実行 | テスト結果 |
| `run-all {domain}` | 全層テスト実行（BE + FE） | テスト結果 |
| `ci` | CI 相当の全テスト実行（BE + FE） | テスト結果 |

### FE テスト

| 引数 | 内容 | 成果物 |
|---|---|---|
| `fe-design {domain} {fe-layer}` | FE テストデータ YAML 作成 | testdata/*.yaml |
| `fe-validate {domain} {fe-layer}` | FE テスト定義の網羅性検証 | validation 結果 |
| `fe-generate {domain} {fe-layer}` | FE テストコード生成 | *.test.ts / *_test.dart |
| `fe-run {domain} {fe-layer}` | FE テスト実行 | テスト結果 |

fe-layer: `state`, `api`, `components`（Domain FE）/ `design-system`（Design System）/ `e2e`（App 層）

---

## 自動推定ルール（引数なしの場合）

`.task/impl-*.prog.md` のメタ情報から domain、layer、scope（be/fe）を特定し、テストの進行状態からサブコマンドを決定する。

**判定ロジック（上から順に評価）:**

1. `.task/impl-*.prog.md` が存在する？
   → No: 「進行中のタスクがありません」と報告して終了
   → Yes: メタ情報から domain, layer, scope を読み取り、次へ

**scope=be（または scope 未指定）の場合:**

2. `libs/domains/{domain}/backend-{tech}/{layer}/testdata/` が存在しない or 空？
   → Yes: `/test design {domain} {layer}` を実行
   → No: 次へ

3. validator 未実行 or testdata 変更後に未再実行？
   → Yes: `/test validate {domain} {layer}` を実行
   → No: 次へ

4. `libs/domains/{domain}/backend-{tech}/{layer}/*_test.go` が存在しない？
   → Yes: `/test generate {domain} {layer}` を実行
   → No: 次へ

5. `_test.go` が存在する？
   → Yes: `/test run {domain} {layer}` を実行

**scope=fe の場合:**

2. `libs/domains/{domain}/frontend-{tech}/{fe-layer}/testdata/` が存在しない or 空？
   → Yes: `/test fe-design {domain} {fe-layer}` を実行
   → No: 次へ

3. validator 未実行 or testdata 変更後に未再実行？
   → Yes: `/test fe-validate {domain} {fe-layer}` を実行
   → No: 次へ

4. テストコード（`*.test.ts` / `*_test.dart`）が存在しない？
   → Yes: `/test fe-generate {domain} {fe-layer}` を実行
   → No: 次へ

5. テストコードが存在する？
   → Yes: `/test fe-run {domain} {fe-layer}` を実行

**validator 実行済みの判定（BE/FE 共通）:**
- validate 結果で error が 0 件であること
- testdata YAML の最終更新が validate 実行後であれば「再実行必要」と判定
- 判定が曖昧な場合は validate を再実行する（安全側に倒す）

---

## /test design {domain} {layer}（BE）

**BE テストデータ YAML を作成する。実装コードの前に実行する。**

layer: `define`, `usecase`, `infrastructure`, `entrypoint`, `platform`

### 必読ソース（必ず読み込んでから作業する）

| ソース | 用途 |
|---|---|
| `conventions/testing.yaml` | テストデータ構造・カテゴリ方針 |
| `conventions/test-coverage.yaml` | ケース分類チェックリスト・validator ルール |
| `conventions/escalation.yaml` | 設計変更時のテスト更新ルール |
| `domains/{domain}/def.yaml` | エンティティ定義（必須パラメータ特定） |
| `domains/{domain}/rule.yaml` | ビジネスルール（状態遷移・不変条件） |
| `domains/{domain}/fn-*.yaml` | 機能仕様（interface・エラーケース一覧） |
| `domains/{domain}/detaildesign-be.md` | テスト方針・テストケース一覧 |

1. 上記の必読ソースをすべて読み込む
2. **test.spec.md を作成する（テスト3層管理の SSoT）:**
   - テストケース一覧を自然言語で記述する
   - テスト戦略（data-driven / integration / e2e）を明記する
   - 期待結果の概要を記述する
   - 配置先: `docs/domains/{domain}/.task/test.spec.md`
3. detaildesign-be.md のテスト方針セクションに基づき、テストケースを洗い出す
4. **test-coverage.yaml のチェックリストを参照し、以下を網羅する:**
   - 正常系: 基本正常系、バリエーション、組み合わせ
   - 異常系: 入力バリデーション、ビジネスルール違反、リソース不在
   - 準正常系: 部分的成功、デグレード、境界値
   - 障害系: インフラ障害、リソース枯渇、データ不整合（層に応じて）
5. 対象層に応じた strategy を決定する:

| layer | strategy | requires | mock |
|---|---|---|---|
| define | data-driven | none | 不要 |
| usecase | data-driven | none | define/ の interface |
| infrastructure | integration | postgres/gcs | 不要（実DB） |
| entrypoint | e2e | mcp-server | usecase をモック |
| platform | integration | postgres/gcs | 不要（実サービス） |

5. `libs/domains/{domain}/backend-{tech}/{layer}/testdata/` に YAML を作成する
6. 各テストケースに以下を含める:
   - テストケース名（日本語、観点が分かる名前）
   - strategy（type, requires）
   - input（入力データ）
   - want（期待結果: error, 各フィールドの値）
   - mock（data-driven のみ: モック動作定義）
   - setup（integration のみ: 事前データ投入）
   - side_effect（モック呼び出し検証）
   - n（テストの意図・補足）
7. 網羅性を確認する:
   - 正常系（全パターン）
   - 異常系（バリデーションエラー、DB エラー等）
   - 境界値（Limit の 0, 20, 100, 101 等）
   - 準正常系（GCS 失敗時の best-effort 等）
8. コミットする
9. `/test validate {domain} {layer}` を実行する
10. error があれば修正し、再度 validate する。error が 0 件になるまで繰り返す
11. warning を確認し、対応が必要なものは追加する
12. `/rev test-design` の実行を提案する

---

## /test validate {domain} {layer}（BE）

**BE テスト定義の網羅性を機械的に検証する。**

前提条件: testdata/*.yaml が存在すること

1. `docs/conventions/test-coverage.yaml` を読み込む
2. 以下のファイルを読み込む:
   - `testdata/*.yaml` — テスト定義
   - `docs/domains/{domain}/def.yaml` — エンティティ定義
   - `docs/domains/{domain}/rule.yaml` — ビジネスルール
   - `docs/domains/{domain}/fn-*.yaml` — 機能仕様
3. validator を実行する（`shared/testutil/validator` が実装済みの場合は Go で実行、未実装の場合は CC が test-coverage.yaml のルールに従って手動検証）:

**必須検証（error — 実装ブロック）:**
- 各 input の必須パラメータに対して、欠落時の異常系ケースが存在するか
- fn-*.yaml の usecase.error_cases に対応するテストケースが存在するか
- 正常系が最低 1 件存在するか
- want.error が null（正常系）と非 null（異常系）の両方が存在するか

**推奨検証（warning — ログ出力）:**
- 境界値テスト（Limit の 0/max/max+1 等）
- 配列パラメータの 0件/1件/複数件
- side_effect 検証の存在
- 準正常系（best-effort 失敗）のカバー
- 障害系（DB/GCS 接続エラー）のカバー

**情報提供（info）:**
- ケース総数と分類内訳
- 未カバーの enum 値

4. 結果を報告する:
   - error: 必ず修正。CC はテスト YAML を追加/修正する
   - warning: CC が判断して対応。理由があればスキップ可
   - info: 参考情報として提示
5. error が 0 件であることを確認して完了

**修正フロー:**
```
/test validate → error 検出 → YAML 修正 → /test validate → error 0 件
                                              ↓
                               /rev test-design（レビュー）
                                              ↓
                               /test generate（テストコード生成）
```

---

## /test generate {domain} {layer}（BE）

**BE testdata YAML からテストコードを生成する。**

1. `testdata/*.yaml` を読み込む
2. strategy に応じてテストコードを生成する:

### data-driven（define/, usecase/）

- `testutil.LoadTestCases()` で YAML をロードするテストコードを生成
- mock 定義からモックオブジェクトのセットアップコードを生成
- want 定義からアサーションコードを生成
- side_effect 定義からモック呼び出し検証コードを生成

生成パターン:

```go
// 例: SaveEntity ユースケースのテスト（ドメイン名・エンティティ名はプロジェクトに合わせて置換）
func TestSaveEntity(t *testing.T) {
    cases := testutil.LoadTestCases[SaveEntityCase]("testdata/save_entity_test.yaml")
    for _, tc := range cases {
        t.Run(tc.Name, func(t *testing.T) {
            // 1. mock setup（tc.Mock から自動セットアップ）
            repo := &mockEntityRepo{storeErr: tc.Mock.RepoStoreErr()}
            storage := &mockLogStorage{uploadErr: tc.Mock.StorageUploadErr()}
            
            // 2. usecase 生成
            uc := usecase.NewSaveEntity(repo, storage)
            
            // 3. execute
            got, err := uc.Execute(context.Background(), tc.Input)
            
            // 4. assert（tc.Want から自動生成）
            tc.Want.Assert(t, got, err)
            
            // 5. side_effect（tc.SideEffect から自動検証）
            tc.SideEffect.Verify(t, repo, storage)
        })
    }
}
```

### integration（infrastructure/, platform/）

- setup セクションから DB 投入コードを生成
- teardown（テスト後のクリーンアップ）を自動付与
- ビルドタグ `//go:build integration` を付与

### e2e（entrypoint/）

- MCP リクエスト/レスポンスのテストコードを生成
- ビルドタグ `//go:build e2e` を付与

3. 生成したテストコードをファイルに書き出す
4. コンパイルが通ることを確認する（`go vet ./...`）
5. コミットする
6. `/rev test-code` の実行を提案する

---

## /test run {domain} {layer}（BE）

**BE 指定層のテストを実行する。**

1. 対象ディレクトリを特定: `libs/domains/{domain}/backend-{tech}/{layer}/`
2. strategy に応じてテストを実行:

| strategy | コマンド |
|---|---|
| data-driven | `go test ./libs/domains/{domain}/backend-{tech}/{layer}/...` |
| integration | `go test -tags=integration ./libs/domains/{domain}/backend-{tech}/{layer}/...` |
| e2e | `go test -tags=e2e ./libs/domains/{domain}/backend-{tech}/{layer}/...` |

3. 結果を整理して報告:
   - PASS / FAIL の件数
   - 失敗したテストケース名と理由
   - カバレッジ（`-coverprofile` オプション付き）

---

## /test run-all {domain}

**ドメイン全層のテストを実行する（BE + FE）。**

**BE:**
1. define/ → usecase/ → infrastructure/ → entrypoint/ の順で実行

**FE（frontend-{tech}/ が存在する場合）:**
2. state/ → api/ → components/ の順で実行

**共通:**
3. 各層の結果をまとめて報告
4. 全 PASS なら「全テスト通過」を報告
5. 1つでも FAIL があれば、失敗箇所を明示して停止

---

## /test ci

**CI/CD 相当の全テスト実行（BE + FE）。**

**BE:**
1. `go test ./...`（data-driven テスト）
2. `go test -tags=integration ./...`（統合テスト、DB 接続必要）
3. `go test -tags=e2e ./...`（E2E テスト、MCP サーバー起動必要）
4. `go vet ./...`（静的解析）

**FE（frontend-{tech}/ が存在する場合）:**
5. `npm test -- --run`（unit / component テスト、Vitest）
6. `npx playwright test`（E2E テスト、ブラウザ必要）

**共通:**
7. 全結果をまとめて報告

---

## BE テストデータ YAML の書き方

### data-driven（define/, usecase/）

```yaml
# Workflowy 互換形式
- c: "正常系_全項目指定"
  children:
    - c: "strategy"
      children:
        - i: "type: data-driven"
        - i: "requires: none"
    - c: "input"
      children:
        - i: "session_id: 'test-session-001'"
        - i: "session_type: 'solviento'"
        - i: "summary: 'テスト対話の要約'"
        - i: "raw_log: '全文ログ内容'"
    - c: "mock"
      children:
        - i: "{Entity}Repository.Store: success"
        - i: "{Entity}LogStorage.Upload: success"
    - c: "want"
      children:
        - i: "error: null"
        - i: "id: not_empty"
        - i: "gcs_path: not_empty"
    - c: "side_effect"
      children:
        - i: "{Entity}Repository.Store: called_once"
        - i: "{Entity}LogStorage.Upload: called_once"
  n: "RawLog ありの正常系。GCS と CloudSQL 両方に保存される"
```

### integration（infrastructure/）

```yaml
- c: "FindByQuery_キーワード検索"
  children:
    - c: "strategy"
      children:
        - i: "type: integration"
        - i: "requires: postgres"
    - c: "setup"
      children:
        - i: "INSERT {table}: {id: '1', name: 'テストデータ1', category: 'category-a'}"
        - i: "INSERT {table}: {id: '2', name: 'テストデータ2', category: 'category-b'}"
    - c: "input"
      children:
        - i: "keyword: '設計'"
        - i: "limit: 20"
        - i: "offset: 0"
    - c: "want"
      children:
        - i: "error: null"
        - i: "total: 1"
        - i: "results[0].id: '1'"
  n: "summary の部分一致検索。ILIKE で大文字小文字を無視"
```

### want の特殊値

| 値 | 意味 |
|---|---|
| `null` | nil / エラーなし |
| `not_empty` | 空でなければ OK（UUID 等） |
| `any` | 値のチェックをスキップ |
| `{エラー変数名}` | 特定のエラー（例: `ErrEmptySessionID`） |
| 具体的な値 | 完全一致 |

### mock の動作指定

| 値 | 意味 |
|---|---|
| `success` | エラーなしで成功を返す |
| `error:{内容}` | 指定されたエラーを返す |
| `skip` | 呼び出されない（side_effect で not_called と組み合わせ） |

### side_effect の検証指定

| 値 | 意味 |
|---|---|
| `called_once` | 1回呼び出された |
| `called:{N}` | N回呼び出された |
| `not_called` | 呼び出されなかった |
| `called_with:{パターン}` | 指定パターンの引数で呼び出された |

---

# FE テストサブコマンド

## /test fe-design {domain} {fe-layer}

**FE テストデータ YAML を作成する。実装コードの前に実行する。**

fe-layer: `state`, `api`, `components`（Domain FE）/ `design-system`（Design System）/ `e2e`（App 層）

### 必読ソース（必ず読み込んでから作業する）

| ソース | 用途 |
|---|---|
| `conventions/testing.yaml` | FE テスト体系・strategy 分類 |
| `conventions/test-coverage.yaml` | ケース分類チェックリスト |
| `domains/{domain}/fe-def.yaml` | FE コンポーネント・API ラッパー定義 |
| `domains/{domain}/fe-state.yaml` | 状態管理設計 |
| `domains/{domain}/fn-*.yaml` | 機能仕様（ui セクション） |
| `domains/{domain}/rule.yaml` | バリデーションルール（BE/FE 共通） |
| `domains/{domain}/detaildesign-fe.md` | FE テスト方針 |
| `domains/{domain}/.task/test.spec.md` | テスト仕様（SSoT、FE セクション） |

1. 上記の必読ソースをすべて読み込む
2. test.spec.md の FE セクションを確認する（未作成なら追記する）
3. fe-layer に応じた strategy を決定する:

| fe-layer | strategy | requires | mock |
|---|---|---|---|
| state | unit | none | API レスポンス（MSW） |
| api | unit | none | generated/ レスポンス |
| components | component | none（jsdom） | props バリエーション |
| design-system | component | none（jsdom） | props バリエーション + a11y |
| e2e | e2e | browser（Playwright） | BE API（MSW or 実サーバー） |

4. testdata/ に YAML を作成する:
   - state/api: `libs/domains/{domain}/frontend-{tech}/{fe-layer}/testdata/`
   - components: `libs/domains/{domain}/frontend-{tech}/components/testdata/`
   - design-system: `libs/shared/design-system-{tech}/testdata/`
   - e2e: `apps/{app-name}/testdata/`
5. 各テストケースに以下を含める:
   - name（テストケース名、日本語可）
   - strategy（type, requires）
   - input（props / action / API パラメータ）
   - mock（API レスポンス定義）
   - want（期待結果: エラー、レンダリング内容、状態変化）
   - interaction（component テストのみ: ユーザー操作 → 期待結果）
6. 網羅性を確認する:
   - 正常系（全 props パターン、全 API レスポンスパターン）
   - 異常系（API エラー、バリデーションエラー）
   - インタラクション（ボタンクリック、フォーム送信、状態遷移）
   - a11y（Design System の場合: axe-core 検証対象）
7. コミットする
8. `/test fe-validate {domain} {fe-layer}` を実行する

---

## /test fe-validate {domain} {fe-layer}

**FE テスト定義の網羅性を検証する。**

前提条件: testdata/*.yaml が存在すること

1. 以下のファイルを読み込む:
   - `testdata/*.yaml` — テスト定義
   - `docs/domains/{domain}/fe-def.yaml` — コンポーネント・API 定義
   - `docs/domains/{domain}/fe-state.yaml` — 状態設計
   - `docs/domains/{domain}/fn-*.yaml` — 機能仕様（ui セクション）
   - `docs/domains/{domain}/rule.yaml` — バリデーションルール

2. 検証する（CC が testing.yaml の FE テスト体系に従って手動検証）:

**必須検証（error — 実装ブロック）:**
- fe-def.yaml の各コンポーネントに対するテストケースが存在するか
- fe-def.yaml の各 API ラッパーに対するテストケースが存在するか
- 正常系が最低 1 件存在するか
- API エラー時の異常系が存在するか

**推奨検証（warning）:**
- fe-state.yaml のサーバー状態ごとにキャッシュ・楽観更新のテストが存在するか
- rule.yaml のバリデーションルールに対する FE 側テストが存在するか
- コンポーネントの全 props バリエーション（必須/任意/エッジ値）
- インタラクションテスト（ユーザー操作→結果）
- a11y テスト（Design System の場合）

**情報提供（info）:**
- ケース総数と分類内訳

3. error が 0 件になるまで修正する
4. `/rev test-design` の実行を提案する

---

## /test fe-generate {domain} {fe-layer}

**FE testdata YAML からテストコードを生成する。**

1. `testdata/*.yaml` を読み込む
2. strategy に応じてテストコードを生成する:

### unit（state/, api/）

- YAML ローダー（test-runner-next の yaml-loader）で YAML をロード
- mock 定義から MSW ハンドラを生成
- want 定義からアサーションコードを生成

生成パターン（Next.js）:

```typescript
// 例: use-orders.test.ts
import { loadTestCases } from '@shared/test-runner-next';
import { renderHook, waitFor } from '@testing-library/react';

const cases = loadTestCases('testdata/use-orders.test.yaml');

describe('useOrders', () => {
  cases.forEach((tc) => {
    it(tc.name, async () => {
      // 1. mock setup（tc.mock から MSW ハンドラ生成）
      setupMockApi(tc.mock);

      // 2. execute
      const { result } = renderHook(() => useOrders(tc.input));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // 3. assert（tc.want から自動生成）
      assertWant(result.current, tc.want);

      // 4. side_effect（tc.side_effect から検証）
      verifySideEffects(tc.side_effect);
    });
  });
});
```

### component（components/, design-system/）

- props パターンを YAML からロード
- render + レンダリング検証 + インタラクション検証を生成

```typescript
// 例: order-summary-card.test.tsx
import { loadTestCases } from '@shared/test-runner-next';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const cases = loadTestCases('testdata/order-summary-card.test.yaml');

describe('OrderSummaryCard', () => {
  cases.forEach((tc) => {
    it(tc.name, async () => {
      // 1. render（tc.input.props から）
      render(<OrderSummaryCard {...tc.input.props} />);

      // 2. assert renders（tc.want.renders から）
      assertRenders(tc.want.renders);

      // 3. interaction（tc.interaction から、存在する場合）
      if (tc.interaction) {
        await runInteractions(tc.interaction);
        assertWant(tc.want);
      }
    });
  });
});
```

### e2e（App 層）

- Playwright テストコードを生成
- 画面遷移、フォーム操作、期待結果の検証

3. 生成したテストコードをファイルに書き出す
4. 型チェックが通ることを確認する（`npx tsc --noEmit`）
5. コミットする
6. `/rev test-code` の実行を提案する

---

## /test fe-run {domain} {fe-layer}

**FE 指定層のテストを実行する。**

1. 対象ディレクトリを特定する:
   - state/api/components: `libs/domains/{domain}/frontend-{tech}/{fe-layer}/`
   - design-system: `libs/shared/design-system-{tech}/`
   - e2e: `apps/{app-name}/`

2. strategy に応じてテストを実行する:

| strategy | コマンド（Next.js） |
|---|---|
| unit | `npx vitest run --dir {対象ディレクトリ}` |
| component | `npx vitest run --dir {対象ディレクトリ}` |
| e2e | `npx playwright test --config {app}/playwright.config.ts` |

3. 結果を整理して報告:
   - PASS / FAIL の件数
   - 失敗したテストケース名と理由
   - カバレッジ（`--coverage` オプション付き）

---

## FE テストデータ YAML の書き方

### unit（state/, api/）

```yaml
# use-orders.test.yaml
- name: "正常系_一覧取得"
  strategy:
    type: unit
    requires: none
  input:
    filters: { status: "active" }
  mock:
    api.listOrders:
      status: 200
      body: { orders: [{ id: "1", status: "active" }], total: 1 }
  want:
    error: null
    data.orders.length: 1
    data.orders[0].status: "active"
  side_effect:
    api.listOrders: called_once

- name: "異常系_APIエラー"
  strategy:
    type: unit
    requires: none
  input:
    filters: { status: "active" }
  mock:
    api.listOrders:
      status: 500
      body: { message: "Internal Server Error" }
  want:
    error: not_empty
    data: null
```

### component（components/）

```yaml
# order-summary-card.test.yaml
- name: "正常系_アクティブ注文の表示"
  strategy:
    type: component
    requires: none
  input:
    props:
      order: { id: "1", status: "active", total: 1500 }
  want:
    renders:
      - text: "注文 #1"
      - text: "¥1,500"
      - testId: "status-badge"
        attribute: { "data-status": "active" }

- name: "インタラクション_キャンセルボタン"
  strategy:
    type: component
    requires: none
  input:
    props:
      order: { id: "1", status: "active", total: 1500 }
      onCancel: "mock_fn"
  interaction:
    - action: click
      target: { testId: "cancel-button" }
  want:
    onCancel: called_once
```

### want の特殊値（BE と共通）

| 値 | 意味 |
|---|---|
| `null` | null / undefined / エラーなし |
| `not_empty` | 空でなければ OK |
| `any` | チェックをスキップ |
| 具体的な値 | 完全一致 |

### want.renders の検証指定（FE 固有）

| キー | 意味 |
|---|---|
| `text: "..."` | 画面にテキストが表示されている |
| `testId: "..."` | data-testid 要素が存在する |
| `attribute: { key: value }` | 要素の属性値を検証 |
| `not_exists: { testId: "..." }` | 要素が存在しないことを検証 |

### interaction の操作指定（FE 固有）

| action | 意味 |
|---|---|
| `click` | 要素をクリック |
| `type` | テキスト入力（`value` キーで入力値を指定） |
| `select` | セレクト選択（`value` キーで選択値を指定） |
| `submit` | フォーム送信 |
