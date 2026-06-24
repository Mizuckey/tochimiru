-- 手動で修正したピン位置を、外部サイト再取り込みで上書きしないためのフラグ
alter table public.lands
  add column if not exists lat_lng_overridden boolean not null default false;
