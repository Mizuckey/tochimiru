import { LandMap } from "@/components/LandMap";
import { getMapboxToken } from "@/lib/get-mapbox-token";
import { getMarketTransactions } from "@/lib/market-transactions-repository";

/** Vercel で設定した環境変数をビルド後も反映する */
export const dynamic = "force-dynamic";

export default async function Home() {
  const marketTransactions = await getMarketTransactions();

  return (
    <div className="flex h-svh flex-col">
      <LandMap
        mapboxToken={getMapboxToken()}
        marketTransactions={marketTransactions}
      />
    </div>
  );
}
