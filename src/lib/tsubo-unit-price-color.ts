import type { LandListing } from "@/types/land";
import type { MarketTransaction } from "@/types/market-transaction";

/** 1坪 = 3.305785㎡（不動産表示の換算） */
export const SQM_PER_TSUBO = 3.305785;

export type LegendItem = { color: string; label: string };

const NO_DATA_COLOR = "#9ca3af";

/** 坪単価（万円/坪）の色分け段階 */
const THRESHOLD_MAN_YEN_PER_TSUBO = [5, 10, 15] as const;

export const TSUBO_UNIT_PRICE_LEGEND: LegendItem[] = [
  { color: "#16a34a", label: "〜5万/坪" },
  { color: "#84cc16", label: "〜10万/坪" },
  { color: "#f59e0b", label: "〜15万/坪" },
  { color: "#dc2626", label: "20万/坪〜" },
];

const COLOR_STOPS = [
  { max: THRESHOLD_MAN_YEN_PER_TSUBO[0], color: "#16a34a" },
  { max: THRESHOLD_MAN_YEN_PER_TSUBO[1], color: "#84cc16" },
  { max: THRESHOLD_MAN_YEN_PER_TSUBO[2], color: "#f59e0b" },
] as const;

function bucketColor(
  valueManYenPerTsubo: number | undefined,
  fallback: string,
): string {
  if (valueManYenPerTsubo === undefined || !Number.isFinite(valueManYenPerTsubo)) {
    return NO_DATA_COLOR;
  }
  for (const t of COLOR_STOPS) {
    if (valueManYenPerTsubo <= t.max) return t.color;
  }
  return fallback;
}

/** 掲載物件: 価格（万円）と面積（㎡）から坪単価（万円/坪） */
export function landListingManYenPerTsubo(land: LandListing): number | undefined {
  if (land.areaSqm == null || land.areaSqm <= 0) return undefined;
  return (land.price * SQM_PER_TSUBO) / land.areaSqm;
}

/** 取引事例: ㎡単価（円）から坪単価（万円/坪） */
export function transactionManYenPerTsubo(
  transaction: MarketTransaction,
): number | undefined {
  const yenPerSqm = transaction.unitPriceYenPerSqm;
  if (yenPerSqm == null || !Number.isFinite(yenPerSqm)) return undefined;
  return (yenPerSqm * SQM_PER_TSUBO) / 10_000;
}

export function getLandListingMarkerColor(land: LandListing): string {
  return bucketColor(landListingManYenPerTsubo(land), "#dc2626");
}

export function getTransactionMarkerColor(transaction: MarketTransaction): string {
  return bucketColor(transactionManYenPerTsubo(transaction), "#dc2626");
}
