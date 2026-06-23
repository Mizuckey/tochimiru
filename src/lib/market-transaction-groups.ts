import type { MarketTransaction } from "@/types/market-transaction";

export type MappableMarketTransaction = MarketTransaction & {
  lat: number;
  lng: number;
};

export type MarketTransactionLocationGroup = {
  key: string;
  lat: number;
  lng: number;
  transactions: MappableMarketTransaction[];
};

export function marketTransactionLocationKey(
  lat: number,
  lng: number,
): string {
  return `${lat.toFixed(6)},${lng.toFixed(6)}`;
}

function compareByPeriod(
  a: MarketTransaction,
  b: MarketTransaction,
): number {
  if (b.year !== a.year) return b.year - a.year;
  return b.quarter - a.quarter;
}

/** 同一 lat/lng の取引を1地点にまとめる（各グループ内は取引時期の新しい順）。 */
export function groupMarketTransactionsByLocation(
  transactions: MappableMarketTransaction[],
): MarketTransactionLocationGroup[] {
  const byKey = new Map<string, MappableMarketTransaction[]>();

  for (const transaction of transactions) {
    const key = marketTransactionLocationKey(transaction.lat, transaction.lng);
    const list = byKey.get(key);
    if (list) {
      list.push(transaction);
    } else {
      byKey.set(key, [transaction]);
    }
  }

  return [...byKey.entries()].map(([key, items]) => {
    const sorted = [...items].sort(compareByPeriod);
    return {
      key,
      lat: sorted[0].lat,
      lng: sorted[0].lng,
      transactions: sorted,
    };
  });
}

export function findLocationGroupForTransaction(
  groups: MarketTransactionLocationGroup[],
  transaction: MarketTransaction | null,
): MarketTransactionLocationGroup | null {
  if (transaction?.lat == null || transaction.lng == null) {
    return null;
  }
  const key = marketTransactionLocationKey(transaction.lat, transaction.lng);
  return groups.find((group) => group.key === key) ?? null;
}
