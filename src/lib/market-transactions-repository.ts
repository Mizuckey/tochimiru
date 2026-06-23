import { getSupabaseClient } from "@/lib/supabase";
import type {
  MarketTransaction,
  MarketTransactionRow,
} from "@/types/market-transaction";

function rowToTransaction(row: MarketTransactionRow): MarketTransaction {
  return {
    id: row.id,
    stationCode: row.station_code,
    stationName: row.station_name,
    year: row.year,
    quarter: row.quarter,
    priceClassification: row.price_classification,
    type: row.type,
    prefecture: row.prefecture,
    municipality: row.municipality,
    districtName: row.district_name,
    tradePriceYen: row.trade_price_yen,
    unitPriceYenPerSqm: row.unit_price_yen_per_sqm,
    areaSqm: row.area_sqm,
    landShape: row.land_shape,
    frontage: row.frontage,
    totalFloorAreaSqm: row.total_floor_area_sqm,
    buildingYear: row.building_year,
    structure: row.structure,
    use: row.use,
    purpose: row.purpose,
    nearestStation: row.nearest_station,
    distanceToNearestStation: row.distance_to_nearest_station,
    period: row.period,
    remarks: row.remarks,
    lat: row.lat ?? null,
    lng: row.lng ?? null,
    geocodeQuery: row.geocode_query ?? null,
  };
}

const SELECT_BASE =
  "id, station_code, station_name, year, quarter, price_classification, type, prefecture, municipality, district_name, trade_price_yen, unit_price_yen_per_sqm, area_sqm, land_shape, frontage, total_floor_area_sqm, building_year, structure, use, purpose, nearest_station, distance_to_nearest_station, period, remarks";

const SELECT_WITH_GEOCODE = `${SELECT_BASE}, lat, lng, geocode_query`;

function isMissingGeocodeColumnError(message: string): boolean {
  return /lat|lng|geocode_query/.test(message) && /does not exist/i.test(message);
}

/**
 * 不動産情報ライブラリ取引事例（五十鈴川駅周辺の取り込み分）。
 * Supabase 未設定・エラー時は空配列。
 * 0006 未適用の DB では lat/lng なしで取得し、地図ピンは出ません。
 */
export async function getMarketTransactions(): Promise<MarketTransaction[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return [];
  }

  const fetchRows = (columns: string) =>
    supabase
      .from("market_transactions")
      .select(columns)
      .order("year", { ascending: false })
      .order("quarter", { ascending: false });

  let { data, error } = await fetchRows(SELECT_WITH_GEOCODE);

  if (error && isMissingGeocodeColumnError(error.message)) {
    console.warn(
      "market_transactions に lat/lng 列がありません。supabase/migrations/0006_add_geocode_to_market_transactions.sql を実行すると地図にピンが出ます。",
    );
    ({ data, error } = await fetchRows(SELECT_BASE));
  }

  if (error) {
    console.error(
      "Supabase からの取引事例取得に失敗しました:",
      error.message,
    );
    return [];
  }

  if (!data) {
    return [];
  }

  return (data as unknown as MarketTransactionRow[]).map(rowToTransaction);
}

export function transactionMapLabel(transaction: MarketTransaction): string {
  const place =
    [transaction.municipality, transaction.districtName]
      .filter(Boolean)
      .join("") || "所在地不明";
  const period =
    transaction.period ??
    `${transaction.year}年 第${transaction.quarter}四半期`;
  return `${place}（${period}）`;
}

export function priceClassificationLabel(
  value: string | null | undefined,
): string | null {
  if (value === "01") return "不動産取引価格情報";
  if (value === "02") return "成約価格情報";
  return value ?? null;
}
