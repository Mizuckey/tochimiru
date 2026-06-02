-- 非推奨: 手入力シード。外部取り込みのみ使う場合は実行しない。
-- 既に投入済みなら supabase/migrations/0004_remove_seed_lands.sql を実行。
insert into public.lands
  (id, name, lat, lng, price, memo, elevation, school_elementary, school_junior_high, tsunami_risk)
values
  ('ise-1', '伊勢市宇治山田町', 34.4881, 136.7074, 1200, '駅近。坂道あり。周辺にスーパー多数', 12, '明倫小学校', '厚生中学校', 'low'),
  ('ise-2', '伊勢市神宮前',     34.4589, 136.7308, 1850, '内宮エリア。観光地の静けさ。価格はやや高め', 24, '浦口小学校', '倉田山中学校', 'low'),
  ('ise-3', '伊勢市二見町',     34.5082, 136.7891,  980, '海近い。二見浦寄り。潮風・塩害は要確認', 4, '二見小学校', '二見中学校', 'high'),
  ('ise-4', '伊勢市宮川町',     34.5123, 136.6978,  750, '宮川沿い。水害リスクはハザードマップで要確認', 7, '四郷小学校', '宮川中学校', 'medium'),
  ('ise-5', '伊勢市吹上',       34.5012, 136.6821, 1100, '閑静な住宅地。車必須になりがち', 9, '厚生小学校', '厚生中学校', 'medium')
on conflict (id) do update set
  name = excluded.name,
  lat = excluded.lat,
  lng = excluded.lng,
  price = excluded.price,
  memo = excluded.memo,
  elevation = excluded.elevation,
  school_elementary = excluded.school_elementary,
  school_junior_high = excluded.school_junior_high,
  tsunami_risk = excluded.tsunami_risk;
