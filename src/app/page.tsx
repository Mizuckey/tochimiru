import { LandMap } from "@/components/LandMap";
import { getMapboxToken } from "@/lib/get-mapbox-token";

/** Vercel で設定した環境変数をビルド後も反映する */
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <div className="flex h-svh flex-col">
      <LandMap mapboxToken={getMapboxToken()} />
    </div>
  );
}
