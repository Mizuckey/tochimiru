/** 地図の表示モード */
export type MapDataMode = "listings" | "reinfolib";

/** 取引事例ピンの色分け指標 */
export type TransactionColorMode = "unitPrice" | "tradePrice";

/** Supabase `market_transactions` の行（snake_case） */
export type MarketTransactionRow = {
  id: string;
  station_code: string;
  station_name: string;
  year: number;
  quarter: number;
  price_classification: string | null;
  type: string | null;
  region: string | null;
  municipality_code: string | null;
  prefecture: string | null;
  municipality: string | null;
  district_name: string | null;
  trade_price_yen: number | null;
  price_per_unit: string | null;
  unit_price_yen_per_sqm: number | null;
  area_sqm: number | null;
  land_shape: string | null;
  frontage: string | null;
  total_floor_area_sqm: number | null;
  building_year: string | null;
  structure: string | null;
  use: string | null;
  purpose: string | null;
  nearest_station: string | null;
  distance_to_nearest_station: string | null;
  period: string | null;
  remarks: string | null;
  lat: number | null;
  lng: number | null;
  geocode_query: string | null;
};

export type MarketTransaction = {
  id: string;
  stationCode: string;
  stationName: string;
  year: number;
  quarter: number;
  priceClassification: string | null;
  type: string | null;
  prefecture: string | null;
  municipality: string | null;
  districtName: string | null;
  tradePriceYen: number | null;
  unitPriceYenPerSqm: number | null;
  areaSqm: number | null;
  landShape: string | null;
  frontage: string | null;
  totalFloorAreaSqm: number | null;
  buildingYear: string | null;
  structure: string | null;
  use: string | null;
  purpose: string | null;
  nearestStation: string | null;
  distanceToNearestStation: string | null;
  period: string | null;
  remarks: string | null;
  lat: number | null;
  lng: number | null;
  geocodeQuery: string | null;
};
