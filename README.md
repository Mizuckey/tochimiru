# トチミル（tochimiru）

伊勢市周辺の公的機関データを地図上で確認する個人開発プロジェクト。設計は [トチミル設計.md](./トチミル設計.md) を参照。

## 現在の実装（Phase 1）

- 不動産情報ライブラリの取引事例を Mapbox 地図上に表示
- 地図上のピン表示・クリックで詳細
- 国土地理院ハザードマップの重ね表示（洪水・津波）
- 取引事例の坪単価による色分け
- 町名リストに基づく学区の強調表示
- 航空写真への切り替え・地図ラベルの日本語化
- Supabase からの取引事例取得

## セットアップ

```bash
npm install
cp .env.example .env.local
# .env.local に Mapbox トークンと Supabase 接続情報を設定
npm run dev
```

[Mapbox アクセストークン](https://account.mapbox.com/access-tokens/) を `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` に設定してください。

## Supabase 連携

不動産情報ライブラリの取引事例は Supabase の `market_transactions` テーブルから取得します。

1. [Supabase](https://supabase.com/) でプロジェクトを作成
2. SQL Editor で以下を順に実行
   - `supabase/migrations/0005_create_market_transactions.sql`
   - `supabase/migrations/0006_add_geocode_to_market_transactions.sql`
3. Settings → API から URL と anon key を取得し `.env.local` に設定

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## 不動産情報ライブラリから取引価格を取り込む

[不動産情報ライブラリ APIマニュアル](https://www.reinfolib.mlit.go.jp/help/apiManual/) の `XIT001`（不動産価格（取引価格・成約価格）情報取得API）を使い、五十鈴川駅周辺の取引価格・成約価格を取得します。

API利用には、[API利用申請](https://www.reinfolib.mlit.go.jp/api/request/) で発行されたAPIキーが必要です。駅指定には国土数値情報（鉄道データ）のグループコードを使います。五十鈴川駅は `007892` です。

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

地図アプリで、ハザードと重ねて確認できます。

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
  lib/
    map-config.ts      # 地図・ハザード設定
    market-transactions-repository.ts # 取引事例取得
    tsubo-unit-price-color.ts         # 色分けロジック・凡例
    supabase.ts        # Supabase クライアント（env 未設定なら null）
  types/               # 型定義
scripts/
  import-reinfolib-isuzugawa-prices.mjs # 不動産情報ライブラリからの取り込み
supabase/
  migrations/          # スキーマ・RLS
```

## デプロイ（Vercel）

1. Project → Settings → Environment Variables
2. 名前は **`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`**（完全一致）
3. 値に Mapbox の `pk.` で始まるトークン
4. **Production**（必要なら Preview も）にチェック → Save
5. **Deployments → 最新の ⋯ → Redeploy**（環境変数追加後は再デプロイ必須）

トークンはサーバーから地図コンポーネントへ渡すため、Vercel 上で設定後に再デプロイすれば反映されます。
