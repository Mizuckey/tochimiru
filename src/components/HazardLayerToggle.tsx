import type { HazardLayerId } from "@/types/land";
import { HAZARD_CATEGORY_ORDER, HAZARD_LAYERS } from "@/lib/map-config";
import { HAZARD_LEGENDS, type HazardLegendId } from "@/lib/hazard-legends";
import { HazardIcon } from "@/components/HazardIcon";

type Props = {
  activeLayers: Set<HazardLayerId>;
  onToggle: (layerId: HazardLayerId) => void;
};

const ALL_IDS = Object.keys(HAZARD_LAYERS) as HazardLayerId[];

export function HazardLayerToggle({ activeLayers, onToggle }: Props) {
  const activeLegendIds = Array.from(
    new Set(
      ALL_IDS.filter((id) => activeLayers.has(id)).map(
        (id) => HAZARD_LAYERS[id].legend,
      ),
    ),
  ) as HazardLegendId[];

  return (
    <div className="flex w-full max-w-full flex-col gap-3 overflow-y-auto rounded-lg border border-zinc-200 bg-white/95 p-3 shadow-sm backdrop-blur sm:max-w-xs lg:max-h-[70vh] lg:w-64">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        ハザードマップ
      </p>

      {HAZARD_CATEGORY_ORDER.map((category) => {
        const ids = ALL_IDS.filter(
          (id) => HAZARD_LAYERS[id].category === category,
        );
        if (ids.length === 0) return null;
        return (
          <div key={category} className="flex flex-col gap-1.5">
            <p className="text-[11px] font-semibold text-zinc-400">{category}</p>
            <div className="grid grid-cols-3 gap-1.5">
              {ids.map((id) => {
                const active = activeLayers.has(id);
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onToggle(id)}
                    className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition-colors ${
                      active
                        ? "border-sky-500 bg-sky-50 text-sky-700"
                        : "border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50"
                    }`}
                    title={HAZARD_LAYERS[id].label}
                  >
                    <HazardIcon id={id} className="size-6" />
                    <span className="text-[10px] leading-tight">
                      {shortLabel(id)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {activeLegendIds.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-zinc-200 pt-2">
          <p className="text-[11px] font-semibold text-zinc-400">凡例</p>
          {activeLegendIds.map((legendId) => {
            const legend = HAZARD_LEGENDS[legendId];
            return (
              <div key={legendId} className="flex flex-col gap-1">
                <p className="text-[11px] font-medium text-zinc-600">
                  {legend.title}
                </p>
                <ul className="flex flex-col gap-0.5">
                  {legend.items.map((item) => (
                    <li
                      key={item.label}
                      className="flex items-center gap-2 text-[11px] text-zinc-700"
                    >
                      <span
                        className="size-3 shrink-0 rounded border border-zinc-300"
                        style={{ backgroundColor: item.color }}
                      />
                      {item.label}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          <p className="text-[10px] leading-tight text-zinc-400">
            色は国土地理院の区分に準拠した代表値です。
          </p>
        </div>
      )}
    </div>
  );
}

/** ボタン用の短いラベル */
function shortLabel(id: HazardLayerId): string {
  const map: Record<HazardLayerId, string> = {
    flood: "洪水",
    floodKeizoku: "継続時間",
    kaokuHanran: "家屋倒壊",
    tsunami: "津波",
    hightide: "高潮",
    debrisFlow: "土石流",
    steepSlope: "急傾斜",
    landslide: "地すべり",
  };
  return map[id];
}
