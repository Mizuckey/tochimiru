import { getSupabaseClient } from "@/lib/supabase";
import type { LandListing, LandRow } from "@/types/land";

function rowToLand(row: LandRow): LandListing {
  return {
    id: row.id,
    name: row.name,
    address: row.address ?? undefined,
    lat: row.lat,
    lng: row.lng,
    price: row.price,
    areaSqm: row.area_sqm ?? undefined,
    memo: row.memo,
    elevation: row.elevation ?? undefined,
    schoolDistrict:
      row.school_elementary || row.school_junior_high
        ? {
            elementary: row.school_elementary ?? undefined,
            juniorHigh: row.school_junior_high ?? undefined,
          }
        : undefined,
    tsunamiRisk: row.tsunami_risk ?? undefined,
    sourceSite: row.source_site ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    imageUrl: row.image_url ?? undefined,
    externalId: row.external_id ?? undefined,
  };
}

/**
 * 土地一覧を取得する（外部サイト取り込み分のみ）。
 * Supabase 未設定・エラー時は空配列。
 */
export async function getLands(): Promise<LandListing[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn(
      "Supabase が未設定のため土地データは表示されません。NEXT_PUBLIC_SUPABASE_URL / ANON_KEY を設定してください。",
    );
    return [];
  }

  const { data, error } = await supabase
    .from("lands")
    .select(
      "id, name, address, lat, lng, price, area_sqm, memo, elevation, school_elementary, school_junior_high, tsunami_risk, source_site, source_url, image_url, external_id",
    )
    .not("source_site", "is", null)
    .order("price", { ascending: true });

  if (error) {
    console.error("Supabase からの土地取得に失敗しました:", error.message);
    return [];
  }

  return (data as LandRow[]).map(rowToLand);
}
