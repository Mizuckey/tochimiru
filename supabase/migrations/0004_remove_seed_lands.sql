-- Phase 0 の手入力シード（ise-*）と、取得元のない行を削除
delete from public.lands
where source_site is null
   or id in ('ise-1', 'ise-2', 'ise-3', 'ise-4', 'ise-5');
