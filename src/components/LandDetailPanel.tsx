import type { LandListing, TsunamiRisk } from "@/types/land";
import { computeLandMetrics, formatDistance } from "@/lib/metrics";

type Props = {
  land: LandListing | null;
  onClose: () => void;
};

const TSUNAMI_LABEL: Record<TsunamiRisk, { text: string; className: string }> = {
  low: { text: "低", className: "text-emerald-700" },
  medium: { text: "中", className: "text-amber-600" },
  high: { text: "高", className: "text-red-600" },
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-zinc-800">{children}</dd>
    </div>
  );
}

export function LandDetailPanel({ land, onClose }: Props) {
  if (!land) {
    return (
      <aside className="flex w-80 shrink-0 flex-col border-l border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">トチミル</h2>
        <p className="mt-2 text-sm text-zinc-600">
          地図のピンをクリックすると、土地の情報が表示されます。
        </p>
        <p className="mt-4 text-xs text-zinc-400">Phase 1 — 伊勢市エリア</p>
      </aside>
    );
  }

  const metrics = computeLandMetrics(land);

  return (
    <aside className="flex w-80 shrink-0 flex-col overflow-y-auto border-l border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900">{land.name}</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100"
          aria-label="閉じる"
        >
          ×
        </button>
      </div>

      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="text-zinc-500">価格</dt>
          <dd className="text-xl font-semibold text-emerald-700">
            {land.price.toLocaleString()} 万円
          </dd>
        </div>

        {metrics.nearestStation && (
          <Row label="最寄り駅">
            {metrics.nearestStation.station.name}　徒歩約
            {metrics.nearestStation.walkMin}分
            <span className="ml-1 text-xs text-zinc-400">
              （{formatDistance(metrics.nearestStation.distanceM)} / 直線推定）
            </span>
            <span className="block text-xs text-zinc-400">
              {metrics.nearestStation.station.line}
            </span>
          </Row>
        )}

        <Row label="標高">
          {land.elevation !== undefined ? `${land.elevation} m` : "—"}
        </Row>

        {metrics.nearestShelter && (
          <Row label="最寄り避難所">
            {metrics.nearestShelter.shelter.name}
            <span className="ml-1 text-xs text-zinc-400">
              （{formatDistance(metrics.nearestShelter.distanceM)}）
            </span>
          </Row>
        )}

        <Row label="津波リスク">
          {land.tsunamiRisk ? (
            <span className={TSUNAMI_LABEL[land.tsunamiRisk].className}>
              {TSUNAMI_LABEL[land.tsunamiRisk].text}
            </span>
          ) : (
            "—"
          )}
        </Row>

        <Row label="学区">
          {land.schoolDistrict ? (
            <>
              小: {land.schoolDistrict.elementary}
              <br />
              中: {land.schoolDistrict.juniorHigh}
            </>
          ) : (
            "—"
          )}
        </Row>

        <div>
          <dt className="text-zinc-500">メモ</dt>
          <dd className="text-zinc-800">{land.memo}</dd>
        </div>
      </dl>

      <p className="mt-4 text-xs text-zinc-400">
        駅徒歩・避難所距離は座標からの直線距離に基づく暫定値です。
      </p>
    </aside>
  );
}
