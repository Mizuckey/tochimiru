import type { LandListing, TsunamiRisk } from "@/types/land";
import { computeLandMetrics, formatDistance } from "@/lib/metrics";
import { resolvedElementaryForLand } from "@/lib/elementary-school-districts";
import { resolvedJuniorHighForLand } from "@/lib/isuzu-junior-high-district";

type Props = {
  land: LandListing | null;
  onClose: () => void;
  onEdit?: (land: LandListing) => void;
  onMovePin?: (land: LandListing) => void;
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

function DetailBody({ land }: { land: LandListing }) {
  const metrics = computeLandMetrics(land);
  const { display: elementary, inferred: elementaryInferred } =
    resolvedElementaryForLand(land);
  const juniorHigh = resolvedJuniorHighForLand(land);
  const juniorHighInferred =
    juniorHigh != null && land.schoolDistrict?.juniorHigh == null;
  const showSchoolDistrict = elementary != null || juniorHigh != null;
  const sourceLinkLabel =
    land.sourceSite === "manual" ? "物件ページ" : (land.sourceSite ?? "物件ページ");

  return (
    <>
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-zinc-500">価格</dt>
          <dd className="text-xl font-semibold text-emerald-700">
            {land.price.toLocaleString()} 万円
          </dd>
        </div>

        {land.address && <Row label="所在地">{land.address}</Row>}

        {land.areaSqm !== undefined && (
          <Row label="土地面積">
            {land.areaSqm.toLocaleString()} ㎡
            <span className="ml-1 text-xs text-zinc-400">
              （約{(land.areaSqm / 3.305785).toFixed(1)}坪）
            </span>
          </Row>
        )}

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

        <Row label="海抜">
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

        {land.tsunamiRisk && (
          <Row label="津波リスク">
            <span className={TSUNAMI_LABEL[land.tsunamiRisk].className}>
              {TSUNAMI_LABEL[land.tsunamiRisk].text}
            </span>
          </Row>
        )}

        <Row label="学区">
          {showSchoolDistrict ? (
            <>
              {elementary != null && (
                <>
                  小: {elementary}
                  {elementaryInferred && (
                    <span className="ml-1 text-xs text-zinc-400">
                      （町名リストより）
                    </span>
                  )}
                </>
              )}
              {elementary != null && juniorHigh != null && <br />}
              {juniorHigh != null && (
                <>
                  中: {juniorHigh}
                  {juniorHighInferred && (
                    <span className="ml-1 text-xs text-zinc-400">
                      （町名リストより）
                    </span>
                  )}
                </>
              )}
            </>
          ) : (
            "—"
          )}
        </Row>

        {land.memo && (
          <div>
            <dt className="text-zinc-500">メモ</dt>
            <dd className="text-zinc-800">{land.memo}</dd>
          </div>
        )}

        {land.imageUrl && (
          <Row label="画像">
            <a
              href={land.imageUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sky-700 underline-offset-2 hover:underline"
            >
              代表画像を開く
            </a>
          </Row>
        )}

        {land.sourceUrl && (
          <Row label="不動産情報リンク">
            <a
              href={land.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sky-700 underline-offset-2 hover:underline"
            >
              {sourceLinkLabel}
            </a>
            {land.externalId && (
              <span className="ml-1 text-xs text-zinc-400">
                ({land.externalId})
              </span>
            )}
          </Row>
        )}
      </dl>

      <p className="mt-4 text-xs text-zinc-400">
        駅徒歩・避難所距離は座標からの直線距離に基づく暫定値です。
      </p>
    </>
  );
}

export function LandDetailPanel({ land, onClose, onEdit, onMovePin }: Props) {
  if (!land) {
    return (
      <aside className="hidden w-72 shrink-0 flex-col border-l border-zinc-200 bg-white p-4 xl:w-80 lg:flex">
        <h2 className="text-lg font-semibold text-zinc-900">トチミル</h2>
        <p className="mt-2 text-sm text-zinc-600">
          地図のピンをクリックすると、土地の情報が表示されます。
        </p>
        <p className="mt-4 text-xs text-zinc-400">
          取り込みデータが無い場合は import スクリプトを実行してください。
        </p>
      </aside>
    );
  }

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-20 bg-black/35 lg:hidden"
        aria-label="詳細を閉じる"
        onClick={onClose}
      />

      <aside
        className="fixed inset-x-0 bottom-0 z-30 flex max-h-[min(58vh,28rem)] flex-col overflow-hidden rounded-t-2xl border-t border-zinc-200 bg-white shadow-2xl lg:static lg:z-auto lg:max-h-none lg:w-72 lg:shrink-0 lg:rounded-none lg:border-l lg:border-t-0 lg:shadow-none xl:w-80"
        role="dialog"
        aria-modal="true"
        aria-label="土地の詳細"
      >
        <div className="shrink-0 border-b border-zinc-100 px-4 pb-2 pt-3 lg:border-0 lg:pt-4">
          <div
            className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-300 lg:hidden"
            aria-hidden
          />
          <div className="flex items-start justify-between gap-2">
            <h2 className="min-w-0 flex-1 text-base font-semibold text-zinc-900 sm:text-lg">
              {land.name}
            </h2>
            <div className="flex shrink-0 items-center gap-1">
              {onMovePin && (
                <button
                  type="button"
                  onClick={() => onMovePin(land)}
                  className="min-h-11 rounded-lg px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 lg:min-h-0 lg:px-2 lg:py-1"
                >
                  ピン位置修正
                </button>
              )}
              {land.sourceSite === "manual" && onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(land)}
                  className="min-h-11 rounded-lg px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 lg:min-h-0 lg:px-2 lg:py-1"
                >
                  編集
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="-mr-1 min-h-11 min-w-11 rounded-lg text-lg text-zinc-500 hover:bg-zinc-100 lg:min-h-0 lg:min-w-0 lg:px-2 lg:py-1 lg:text-sm"
                aria-label="閉じる"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 lg:pb-4">
          <DetailBody land={land} />
        </div>
      </aside>
    </>
  );
}
