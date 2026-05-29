/** サーバー側で Mapbox トークンを取得（Vercel の環境変数をランタイムで読む） */
export function getMapboxToken(): string | undefined {
  const token =
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ??
    process.env.MAPBOX_ACCESS_TOKEN;
  const trimmed = token?.trim();
  return trimmed || undefined;
}
