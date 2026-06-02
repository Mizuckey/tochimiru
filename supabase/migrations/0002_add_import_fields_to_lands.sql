-- 実サイトから取得した物件情報を保持するための追加項目
alter table public.lands
  add column if not exists address text,
  add column if not exists area_sqm numeric,
  add column if not exists source_site text,
  add column if not exists source_url text,
  add column if not exists external_id text,
  add column if not exists fetched_at timestamptz;

create unique index if not exists lands_source_site_external_id_idx
  on public.lands (source_site, external_id)
  where source_site is not null and external_id is not null;
