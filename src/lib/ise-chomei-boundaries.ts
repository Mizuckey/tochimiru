import iseChomeiBoundaries from "@/data/ise-chomei-boundaries.json";
import type { MarketTransaction } from "@/types/market-transaction";

export type IseChomeiBoundaryProperties = {
  boundaryId: string;
  keyCode: string;
  name: string;
  normalizedName: string;
  baseName: string;
  centerLng: number | null;
  centerLat: number | null;
  areaSqm: number | null;
  population: number | null;
  households: number | null;
  transactionCount?: number;
};

export type IseChomeiBoundaryFeature = GeoJSON.Feature<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  IseChomeiBoundaryProperties
>;

export type IseChomeiBoundaryFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  IseChomeiBoundaryProperties
>;

const KANSUJI_DIGITS: Record<string, number> = {
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
};

export const ISE_CHOMEI_BOUNDARIES =
  iseChomeiBoundaries as IseChomeiBoundaryFeatureCollection;

function kansujiToNumber(value: string): number | null {
  if (value === "十") return 10;
  if (value.startsWith("十")) {
    return 10 + (KANSUJI_DIGITS[value.slice(1)] ?? 0);
  }
  if (value.endsWith("十")) {
    return (KANSUJI_DIGITS[value[0]] ?? 1) * 10;
  }
  if (value.includes("十")) {
    const [tens, ones] = value.split("十");
    return (KANSUJI_DIGITS[tens] ?? 1) * 10 + (KANSUJI_DIGITS[ones] ?? 0);
  }
  return KANSUJI_DIGITS[value] ?? null;
}

export function normalizeChomeiName(value: string | null | undefined): string {
  if (!value) return "";

  return value
    .normalize("NFKC")
    .replace(/三重県/g, "")
    .replace(/伊勢市/g, "")
    .replace(/\s+/g, "")
    .replace(/[一二三四五六七八九十]+丁目/g, (match) => {
      const number = kansujiToNumber(match.replace("丁目", ""));
      return number == null ? match : `${number}丁目`;
    });
}

export function baseChomeiName(value: string | null | undefined): string {
  return normalizeChomeiName(value).replace(/\d+丁目$/, "");
}

export function transactionChomeiNames(transaction: MarketTransaction): {
  normalizedName: string;
  baseName: string;
} {
  const place = [transaction.municipality, transaction.districtName]
    .filter(Boolean)
    .join("");
  return {
    normalizedName: normalizeChomeiName(place),
    baseName: baseChomeiName(place),
  };
}

export function boundaryMatchesTransaction(
  boundary: IseChomeiBoundaryProperties,
  transaction: MarketTransaction,
): boolean {
  const { normalizedName, baseName } = transactionChomeiNames(transaction);
  if (!normalizedName) return false;
  if (boundary.normalizedName === normalizedName) return true;

  const transactionHasChome = /\d+丁目$/.test(normalizedName);
  if (transactionHasChome) return false;

  return (
    boundary.baseName === normalizedName ||
    boundary.baseName === baseName
  );
}
