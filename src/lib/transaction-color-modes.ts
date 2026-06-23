import type { MarketTransaction, TransactionColorMode } from "@/types/market-transaction";
import type { LegendItem } from "@/lib/color-modes";

export type TransactionColorModeConfig = {
  id: TransactionColorMode;
  label: string;
  legend: LegendItem[];
};

const NO_DATA_COLOR = "#9ca3af";

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

/** 取引総額（円）→ 万円換算で色分け */
export const TRANSACTION_COLOR_MODES: Record<
  TransactionColorMode,
  TransactionColorModeConfig
> = {
  unitPrice: {
    id: "unitPrice",
    label: "㎡単価",
    legend: [
      { color: "#16a34a", label: "〜5万/㎡" },
      { color: "#84cc16", label: "〜10万/㎡" },
      { color: "#f59e0b", label: "〜15万/㎡" },
      { color: "#dc2626", label: "15万/㎡〜" },
    ],
  },
  tradePrice: {
    id: "tradePrice",
    label: "取引価格",
    legend: [
      { color: "#16a34a", label: "〜2,000万" },
      { color: "#84cc16", label: "〜4,000万" },
      { color: "#f59e0b", label: "〜6,000万" },
      { color: "#dc2626", label: "6,000万〜" },
    ],
  },
};

export function getTransactionMarkerColor(
  mode: TransactionColorMode,
  transaction: MarketTransaction,
): string {
  switch (mode) {
    case "unitPrice":
      return bucketColor(
        transaction.unitPriceYenPerSqm ?? undefined,
        [
          { max: 50_000, color: "#16a34a" },
          { max: 100_000, color: "#84cc16" },
          { max: 150_000, color: "#f59e0b" },
        ],
        "#dc2626",
      );
    case "tradePrice": {
      const manYen =
        transaction.tradePriceYen != null
          ? transaction.tradePriceYen / 10_000
          : undefined;
      return bucketColor(
        manYen,
        [
          { max: 2000, color: "#16a34a" },
          { max: 4000, color: "#84cc16" },
          { max: 6000, color: "#f59e0b" },
        ],
        "#dc2626",
      );
    }
  }
}
