# トチミル（tochimiru）

伊勢市の売地を地図上で見る個人開発プロジェクト。設計は [トチミル設計.md](./トチミル設計.md) を参照。

## 現在の実装（Phase 1）

- 伊勢市エリアに絞った土地データ（5件・JSON直書き）
- Mapbox 地図上のピン表示・クリックで詳細
- 国土地理院ハザードマップの重ね表示（洪水・津波）
- 最寄り駅と徒歩分（座標からの直線距離による推定）
- 標高・最寄り避難所までの距離・学区の表示
- 指標による色分け（価格 / 駅距離 / 標高 / 津波リスク）
- 航空写真への切り替え・地図ラベルの日本語化
- 土地データの Supabase 連携（未設定時はハードコードにフォールバック）

## セットアップ

```bash
npm install
cp .env.example .env.local
# .env.local に Mapbox トークン（と任意で Supabase）を設定
npm run dev
```

[Mapbox アクセストークン](https://account.mapbox.com/access-tokens/) を `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` に設定してください。

## Supabase 連携

土地データは Supabase が設定されていれば DB から、なければ `src/data/lands.ts` のハードコードデータを使います。

1. [Supabase](https://supabase.com/) でプロジェクトを作成
2. SQL Editor で以下を順に実行
   - `supabase/migrations/0001_create_lands.sql`（テーブル・RLS）
   - `supabase/seed.sql`（初期データ5件）
3. Settings → API から URL と anon key を取得し `.env.local` に設定

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

`lands` テーブルは RLS で**読み取りのみ公開**です。anon key はクライアントに露出しても問題ありませんが、書き込み機能を追加する際は別途ポリシーと認証を設計してください。

## プロジェクト構成

```
src/
  app/                 # Next.js App Router
  components/          # 地図・UI
  data/
    lands.ts           # 土地データ（Supabase 未設定時のフォールバック）
    stations.ts        # 駅の参照データ（最寄り駅算出）
    shelters.ts        # 避難所の参照データ（最寄り避難所算出）
  lib/
    map-config.ts      # 地図・ハザード設定
    metrics.ts         # 距離・徒歩分などの算出
    color-modes.ts     # 色分けロジック・凡例
    supabase.ts        # Supabase クライアント（env 未設定なら null）
    lands-repository.ts# 土地取得（Supabase / フォールバック）
  types/               # 型定義
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
