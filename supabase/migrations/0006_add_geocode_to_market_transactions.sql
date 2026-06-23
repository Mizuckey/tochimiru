-- 地図表示用（町丁目代表のジオコーディング結果）
alter table public.market_transactions
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists geocode_query text;

create index if not exists market_transactions_map_idx
  on public.market_transactions (lat, lng)
  where lat is not null and lng is not null;
