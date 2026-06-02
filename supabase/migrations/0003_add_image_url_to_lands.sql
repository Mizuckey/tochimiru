-- 取得元サイト上の代表画像URL（画像自体は保存しない）
alter table public.lands
  add column if not exists image_url text;
