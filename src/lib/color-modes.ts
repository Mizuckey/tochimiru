import type { ColorMode, LandListing, TsunamiRisk } from "@/types/land";
import type { LandMetrics } from "@/lib/metrics";

export type LegendItem = { color: string; label: string };

export type ColorModeConfig = {
  id: ColorMode;
  label: string;
  legend: LegendItem[];
};

const NO_DATA_COLOR = "#9ca3af"; // zinc-400

/** 値を段階ごとの色に割り当てる共通ヘルパー */
function bucketColor(
  value: number | undefined,
  thresholds: { max: number; color: string }[],
  fallback: string,
): string {
  if (value === undefined) return NO_DATA_COLOR;
  for (const t of thresholds) {
    if (value <= t.max) return t.color;
  }
  return fallback;
}

const TSUNAMI_COLORS: Record<TsunamiRisk, string> = {
  low: "#16a34a", // green-600
  medium: "#f59e0b", // amber-500
  high: "#dc2626", // red-600
};

export const COLOR_MODES: Record<ColorMode, ColorModeConfig> = {
  price: {
    id: "price",
    label: "価格",
    legend: [
      { color: "#16a34a", label: "〜900万" },
      { color: "#84cc16", label: "〜1200万" },
      { color: "#f59e0b", label: "〜1600万" },
      { color: "#dc2626", label: "1600万〜" },
    ],
  },
  station: {
    id: "station",
    label: "駅距離",
    legend: [
      { color: "#16a34a", label: "〜10分" },
      { color: "#84cc16", label: "〜20分" },
      { color: "#f59e0b", label: "〜30分" },
      { color: "#dc2626", label: "30分〜" },
    ],
  },
  elevation: {
    id: "elevation",
    label: "標高",
    legend: [
      { color: "#dc2626", label: "〜5m" },
      { color: "#f59e0b", label: "〜10m" },
      { color: "#84cc16", label: "〜20m" },
      { color: "#16a34a", label: "20m〜" },
    ],
  },
  tsunami: {
    id: "tsunami",
    label: "津波リスク",
    legend: [
      { color: TSUNAMI_COLORS.low, label: "低" },
      { color: TSUNAMI_COLORS.medium, label: "中" },
      { color: TSUNAMI_COLORS.high, label: "高" },
    ],
  },
};

export function getMarkerColor(
  mode: ColorMode,
  land: LandListing,
  metrics: LandMetrics,
): string {
  switch (mode) {
    case "price":
      return bucketColor(
        land.price,
        [
          { max: 900, color: "#16a34a" },
          { max: 1200, color: "#84cc16" },
          { max: 1600, color: "#f59e0b" },
        ],
        "#dc2626",
      );
    case "station":
      return bucketColor(
        metrics.nearestStation?.walkMin,
        [
          { max: 10, color: "#16a34a" },
          { max: 20, color: "#84cc16" },
          { max: 30, color: "#f59e0b" },
        ],
        "#dc2626",
      );
    case "elevation":
      return bucketColor(
        land.elevation,
        [
          { max: 5, color: "#dc2626" },
          { max: 10, color: "#f59e0b" },
          { max: 20, color: "#84cc16" },
        ],
        "#16a34a",
      );
    case "tsunami":
      return land.tsunamiRisk ? TSUNAMI_COLORS[land.tsunamiRisk] : NO_DATA_COLOR;
  }
}
