-- 不動産情報ライブラリ（取引価格・成約価格）の保存先
create table if not exists public.market_transactions (
  id text primary key,
  station_code text not null,
  station_name text not null,
  year integer not null,
  quarter integer not null,
  price_classification text,
  type text,
  region text,
  municipality_code text,
  prefecture text,
  municipality text,
  district_name text,
  trade_price_yen bigint,
  price_per_unit text,
  unit_price_yen_per_sqm bigint,
  area_sqm numeric,
  land_shape text,
  frontage text,
  total_floor_area_sqm numeric,
  building_year text,
  structure text,
  use text,
  purpose text,
  nearest_station text,
  distance_to_nearest_station text,
  period text,
  remarks text,
  raw_json jsonb not null,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists market_transactions_station_period_idx
  on public.market_transactions (station_code, year, quarter);

create index if not exists market_transactions_district_idx
  on public.market_transactions (municipality, district_name);

drop trigger if exists trg_market_transactions_updated_at on public.market_transactions;
create trigger trg_market_transactions_updated_at
  before update on public.market_transactions
  for each row execute function public.set_updated_at();

alter table public.market_transactions enable row level security;

drop policy if exists "market transactions are viewable by everyone"
  on public.market_transactions;
create policy "market transactions are viewable by everyone"
  on public.market_transactions
  for select
  using (true);
