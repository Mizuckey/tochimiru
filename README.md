# トチミル（tochimiru）

伊勢市の売地を地図上で見る個人開発プロジェクト。設計は [トチミル設計.md](./トチミル設計.md) を参照。

## 現在の実装（Phase 0 骨組み）

- 伊勢市エリアに絞った土地データ（5件・JSON直書き）
- Mapbox 地図上のピン表示・クリックで詳細
- 国土地理院ハザードマップの重ね表示（洪水・津波）

## セットアップ

```bash
npm install
cp .env.example .env.local
# .env.local に Mapbox トークンを設定
npm run dev
```

[Mapbox アクセストークン](https://account.mapbox.com/access-tokens/) を `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` に設定してください。

## プロジェクト構成

```
src/
  app/           # Next.js App Router
  components/    # 地図・UI
  data/lands.ts  # 土地データ（Phase 0 はハードコード）
  lib/           # 地図・ハザード設定
  types/         # 型定義
```

## デプロイ（Vercel）

1. Project → Settings → Environment Variables
2. 名前は **`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`**（完全一致）
3. 値に Mapbox の `pk.` で始まるトークン
4. **Production**（必要なら Preview も）にチェック → Save
5. **Deployments → 最新の ⋯ → Redeploy**（環境変数追加後は再デプロイ必須）

トークンはサーバーから地図コンポーネントへ渡すため、Vercel 上で設定後に再デプロイすれば反映されます。
