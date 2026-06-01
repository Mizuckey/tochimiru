import { lands as fallbackLands } from "@/data/lands";
import { getSupabaseClient } from "@/lib/supabase";
import type { LandListing, LandRow } from "@/types/land";

function rowToLand(row: LandRow): LandListing {
  return {
    id: row.id,
    name: row.name,
    lat: row.lat,
    lng: row.lng,
    price: row.price,
    memo: row.memo,
    elevation: row.elevation ?? undefined,
    schoolDistrict:
      row.school_elementary && row.school_junior_high
        ? {
            elementary: row.school_elementary,
            juniorHigh: row.school_junior_high,
          }
        : undefined,
    tsunamiRisk: row.tsunami_risk ?? undefined,
  };
}

/**
 * 土地一覧を取得する。
 * Supabase が設定されていれば DB から、なければハードコードデータを返す。
 */
export async function getLands(): Promise<LandListing[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return fallbackLands;
  }

  const { data, error } = await supabase
    .from("lands")
    .select(
      "id, name, lat, lng, price, memo, elevation, school_elementary, school_junior_high, tsunami_risk",
    )
    .order("price", { ascending: true });

  if (error) {
    console.error("Supabase からの土地取得に失敗しました:", error.message);
    return fallbackLands;
  }

  return (data as LandRow[]).map(rowToLand);
}
