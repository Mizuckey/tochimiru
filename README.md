# トチミル（tochimiru）

伊勢市の売地を地図上で見る個人開発プロジェクト。設計は [トチミル設計.md](./トチミル設計.md) を参照。

## 現在の実装（Phase 1）

- 伊勢市エリアの土地データ（不動産会社サイトからの取り込み）
- Mapbox 地図上のピン表示・クリックで詳細
- 国土地理院ハザードマップの重ね表示（洪水・津波）
- 最寄り駅と徒歩分（座標からの直線距離による推定）
- 標高・最寄り避難所までの距離・学区の表示
- 指標による色分け（価格 / 駅距離 / 標高 / 津波リスク）
- **売地**と**不動産情報ライブラリの取引事例**を地図上で切り替え表示（ハザード重ね表示は共通）
- 航空写真への切り替え・地図ラベルの日本語化
- 土地データの Supabase 連携（未設定時はハードコードにフォールバック）
- ヴェリンダホームズ（伊勢市の不動産会社）から売土地データを取得してSupabaseへ取り込み

## セットアップ

```bash
npm install
cp .env.example .env.local
# .env.local に Mapbox トークン（と任意で Supabase）を設定
npm run dev
```

[Mapbox アクセストークン](https://account.mapbox.com/access-tokens/) を `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` に設定してください。

## Supabase 連携

土地データは Supabase の `lands` テーブルから取得します。**`source_site` がある行だけ**表示します（外部取り込み分のみ）。

1. [Supabase](https://supabase.com/) でプロジェクトを作成
2. SQL Editor で以下を順に実行
   - `supabase/migrations/0001_create_lands.sql`（テーブル・RLS）
   - `supabase/migrations/0002_add_import_fields_to_lands.sql`（取得元URL・面積など）
   - `supabase/migrations/0003_add_image_url_to_lands.sql`（取得元サイトの代表画像URL）
   - `supabase/migrations/0004_remove_seed_lands.sql`（手入力シードの削除・任意）
3. Settings → API から URL と anon key を取得し `.env.local` に設定

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

`lands` テーブルは RLS で**読み取りのみ公開**です。anon key はクライアントに露出しても問題ありませんが、書き込み機能を追加する際は別途ポリシーと認証を設計してください。

## 実サイトから土地データを取り込む

検索上位の地場不動産会社サイトとして、以下を対象にしています。`robots.txt` で対象ページが禁止されていないことを確認したうえで、低頻度アクセス（物件ごとに待機）で取得します。

- `belinda.co.jp`（ヴェリンダホームズ）
- `sokenhousing.co.jp`（創建ハウジング）
- `nk-housing.co.jp`（ナカムラ工務店 / NKハウジング）

取り込みにはSupabaseの `service_role` キーが必要です。これはサーバー/ローカルスクリプト専用の秘密鍵なので、`NEXT_PUBLIC_` を付けず、絶対にGitへコミットしないでください。

`.env.local` に追加:

```bash
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

プレビュー（DBへ書き込まない）:

```bash
npm run import:belinda-lands -- --dry-run --limit=3
npm run import:soken-lands -- --dry-run --limit=3
npm run import:nk-lands -- --dry-run --limit=3
```

Supabaseへ取り込み:

```bash
npm run import:belinda-lands
npm run import:soken-lands
npm run import:nk-lands

# まとめて実行
npm run import:lands

# 取得元を指定してまとめ実行用ラッパーを使う
npm run import:lands -- --source=belinda
npm run import:lands -- --source=soken
npm run import:lands -- --source=nk
npm run import:lands -- --source=all --dry-run
```

取得項目:

- 物件名
- 所在地
- 価格（万円）
- 土地面積（㎡）
- 交通・坪単価・公開日などのメモ
- 取得元URL
- 取得元サイト上の代表画像URL（画像自体は保存しない）
- Mapbox Geocodingによる緯度経度

## GitHub Actions で定期取り込み

`.github/workflows/import-lands.yml` で、毎日 JST 05:20 に `npm run import:lands -- --source=all` を実行します。Actions 画面から手動実行もできます。

GitHub の Repository → Settings → Secrets and variables → Actions → Repository secrets に以下を登録してください。

```bash
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

手動実行では `source`（`all` / `belinda` / `soken` / `nk`）と `dry_run` を選べます。`dry_run=true` の場合はSupabaseへ書き込みません。

## 不動産情報ライブラリから取引価格を取り込む

[不動産情報ライブラリ APIマニュアル](https://www.reinfolib.mlit.go.jp/help/apiManual/) の `XIT001`（不動産価格（取引価格・成約価格）情報取得API）を使い、五十鈴川駅周辺の取引価格・成約価格を取得します。

API利用には、[API利用申請](https://www.reinfolib.mlit.go.jp/api/request/) で発行されたAPIキーが必要です。駅指定には国土数値情報（鉄道データ）のグループコードを使います。五十鈴川駅は `007892` です。

Supabase SQL Editorで以下を実行してください。

```text
supabase/migrations/0005_create_market_transactions.sql
supabase/migrations/0006_add_geocode_to_market_transactions.sql
```

`.env.local` または GitHub Actions Secrets に追加:

```bash
REAL_ESTATE_INFO_LIBRARY_API_KEY=...
```

ローカルでプレビュー:

```bash
npm run import:isuzugawa-prices -- --from-year=2021 --to-year=2026 --dry-run
```

Supabaseへ取り込み:

```bash
npm run import:isuzugawa-prices -- --from-year=2021 --to-year=2026
```

取り込み時に Mapbox Geocoding で町丁目代表の緯度経度を付与します（`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` 必須）。ジオコードをスキップする場合は `--skip-geocode` を付けてください（地図モードではピンが出ません）。

地図アプリの左上「表示モード」→ **取引事例** で、ハザードと重ねて確認できます。

価格情報区分を指定する場合:

```bash
# 01: 不動産取引価格情報のみ
npm run import:isuzugawa-prices -- --from-year=2021 --to-year=2026 --classification=01

# 02: 成約価格情報のみ
npm run import:isuzugawa-prices -- --from-year=2021 --to-year=2026 --classification=02
```

GitHub Actionsでは `.github/workflows/import-market-transactions.yml` が毎月1日 JST 06:10 に実行されます。手動実行では `from_year` / `to_year` / `classification` / `dry_run` を指定できます。

## プロジェクト構成

```
src/
  app/                 # Next.js App Router
  components/          # 地図・UI
  data/
    lands.ts           # 地図の初期中心座標のみ
    stations.ts        # 駅の参照データ（最寄り駅算出）
    shelters.ts        # 避難所の参照データ（最寄り避難所算出）
  lib/
    map-config.ts      # 地図・ハザード設定
    metrics.ts         # 距離・徒歩分などの算出
    color-modes.ts     # 色分けロジック・凡例
    supabase.ts        # Supabase クライアント（env 未設定なら null）
    lands-repository.ts# 土地取得（Supabase / フォールバック）
  types/               # 型定義
scripts/
  import-belinda-lands.mjs # ヴェリンダホームズからの取り込み
  import-soken-lands.mjs   # 創建ハウジングからの取り込み
supabase/
  migrations/          # スキーマ・RLS
  seed.sql             # 初期データ
```

## デプロイ（Vercel）

1. Project → Settings → Environment Variables
2. 名前は **`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`**（完全一致）
3. 値に Mapbox の `pk.` で始まるトークン
4. **Production**（必要なら Preview も）にチェック → Save
5. **Deployments → 最新の ⋯ → Redeploy**（環境変数追加後は再デプロイ必須）

トークンはサーバーから地図コンポーネントへ渡すため、Vercel 上で設定後に再デプロイすれば反映されます。
