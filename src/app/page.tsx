import { LandMap } from "@/components/LandMap";
import { getMapboxToken } from "@/lib/get-mapbox-token";
import { getLands } from "@/lib/lands-repository";

/** Vercel で設定した環境変数をビルド後も反映する */
export const dynamic = "force-dynamic";

export default async function Home() {
  const lands = await getLands();

  return (
    <div className="flex h-svh flex-col">
      <LandMap mapboxToken={getMapboxToken()} lands={lands} />
    </div>
  );
}
