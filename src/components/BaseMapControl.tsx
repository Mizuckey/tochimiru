import { BASE_MAPS, type BaseMapId } from "@/lib/map-config";

type Props = {
  baseMap: BaseMapId;
  onChange: (baseMap: BaseMapId) => void;
};

const ORDER: BaseMapId[] = ["standard", "satellite"];

export function BaseMapControl({ baseMap, onChange }: Props) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-zinc-200 bg-white/95 shadow-sm backdrop-blur">
      {ORDER.map((id) => (
        <button
          key={id}
          type="button"
          aria-pressed={baseMap === id}
          onClick={() => onChange(id)}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            baseMap === id
              ? "bg-zinc-900 text-white"
              : "text-zinc-700 hover:bg-zinc-100"
          }`}
        >
          {BASE_MAPS[id].label}
        </button>
      ))}
    </div>
  );
}
