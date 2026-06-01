-- 土地（売地）テーブル
create table if not exists public.lands (
  id text primary key,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  price integer not null, -- 価格（万円）
  memo text not null default '',
  elevation numeric, -- 標高（m）
  school_elementary text, -- 小学校区
  school_junior_high text, -- 中学校区
  tsunami_risk text check (tsunami_risk in ('low', 'medium', 'high')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 更新時刻の自動更新
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_lands_updated_at on public.lands;
create trigger trg_lands_updated_at
  before update on public.lands
  for each row execute function public.set_updated_at();

-- RLS: 公開データとして読み取りのみ許可
alter table public.lands enable row level security;

drop policy if exists "lands are viewable by everyone" on public.lands;
create policy "lands are viewable by everyone"
  on public.lands
  for select
  using (true);
