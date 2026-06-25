-- J-SHIS 表層地盤 API（250m メッシュ、V4/2020年版）の取得結果キャッシュ
create table if not exists public.jshis_surface_soil_cache (
  location_key text primary key, -- 緯度経度を小数6桁に丸めた "lat,lng"
  meshcode text not null,
  version text not null default 'V4',
  geomorphology_code text,
  geomorphology_name text,
  avs30 numeric, -- 表層30mの平均S波速度（m/s）
  amplification_factor numeric, -- 工学的基盤から地表に至る最大速度の増幅率（ARV）
  raw_json jsonb,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jshis_surface_soil_cache_meshcode_idx
  on public.jshis_surface_soil_cache (meshcode);

drop trigger if exists trg_jshis_surface_soil_cache_updated_at
  on public.jshis_surface_soil_cache;
create trigger trg_jshis_surface_soil_cache_updated_at
  before update on public.jshis_surface_soil_cache
  for each row execute function public.set_updated_at();

alter table public.jshis_surface_soil_cache enable row level security;

drop policy if exists "surface soil cache is viewable by everyone"
  on public.jshis_surface_soil_cache;
create policy "surface soil cache is viewable by everyone"
  on public.jshis_surface_soil_cache
  for select
  using (true);

-- 保存は Next.js API Route から SUPABASE_SERVICE_ROLE_KEY で行う想定。
-- lands / market_transactions に直接持たせる場合に追加する参照カラム:
alter table public.lands
  add column if not exists jshis_surface_soil_location_key text
    references public.jshis_surface_soil_cache(location_key);

alter table public.market_transactions
  add column if not exists jshis_surface_soil_location_key text
    references public.jshis_surface_soil_cache(location_key);
