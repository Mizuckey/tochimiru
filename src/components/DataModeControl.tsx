import type { MapDataMode } from "@/types/market-transaction";

type Props = {
  mode: MapDataMode;
  onChange: (mode: MapDataMode) => void;
};

const MODES: { id: MapDataMode; label: string }[] = [
  { id: "listings", label: "売地" },
  { id: "reinfolib", label: "取引事例" },
];

export function DataModeControl({ mode, onChange }: Props) {
  return (
    <div className="flex w-full max-w-full flex-col gap-1.5 rounded-lg border border-zinc-200 bg-white/95 p-3 shadow-sm backdrop-blur sm:max-w-xs">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        表示モード
      </p>
      <div className="flex overflow-hidden rounded-lg border border-zinc-200">
        {MODES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={mode === id}
            onClick={() => onChange(id)}
            className={`min-h-10 flex-1 px-2 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
              mode === id
                ? "bg-zinc-900 text-white"
                : "bg-white text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="text-[10px] leading-snug text-zinc-500 sm:text-xs">
        {mode === "listings"
          ? "不動産会社サイトから取り込んだ売地です。"
          : "不動産情報ライブラリの公示取引（五十鈴川駅周辺）です。"}
      </p>
    </div>
  );
}
