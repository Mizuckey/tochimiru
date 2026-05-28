import type { HazardLayerId } from "@/types/land";
import { HAZARD_LAYERS } from "@/lib/map-config";

type Props = {
  activeLayers: Set<HazardLayerId>;
  onToggle: (layerId: HazardLayerId) => void;
};

export function HazardLayerToggle({ activeLayers, onToggle }: Props) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white/95 p-3 shadow-sm backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        ハザードマップ
      </p>
      {(Object.keys(HAZARD_LAYERS) as HazardLayerId[]).map((id) => (
        <label
          key={id}
          className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800"
        >
          <input
            type="checkbox"
            checked={activeLayers.has(id)}
            onChange={() => onToggle(id)}
            className="size-4 rounded border-zinc-300"
          />
          {HAZARD_LAYERS[id].label}
        </label>
      ))}
    </div>
  );
}
