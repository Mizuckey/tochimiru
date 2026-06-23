import type { ColorMode } from "@/types/land";
import { COLOR_MODES } from "@/lib/color-modes";

type Props = {
  mode: ColorMode;
  onChange: (mode: ColorMode) => void;
  embedded?: boolean;
};

export function ColorModeControl({ mode, onChange, embedded }: Props) {
  const config = COLOR_MODES[mode];

  const body = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        色分け
      </p>
      <div className="flex flex-wrap gap-1">
        {(Object.keys(COLOR_MODES) as ColorMode[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              mode === id
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            {COLOR_MODES[id].label}
          </button>
        ))}
      </div>
      <ul className="flex flex-col gap-0.5">
        {config.legend.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-[11px] text-zinc-700">
            <span
              className="size-2.5 shrink-0 rounded-full border border-white shadow"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </li>
        ))}
      </ul>
    </>
  );

  if (embedded) {
    return <div className="flex flex-col gap-1.5">{body}</div>;
  }

  return (
    <div className="flex w-full max-w-full flex-col gap-2 rounded-lg border border-zinc-200 bg-white/95 p-3 shadow-sm backdrop-blur sm:max-w-xs">
      {body}
    </div>
  );
}
