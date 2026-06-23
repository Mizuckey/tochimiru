type Accent = "sky" | "teal" | "violet";

type Props = {
  label: string;
  active: boolean;
  onToggle: () => void;
  /** 校区セクション内のコンパクト行 */
  compact?: boolean;
  accent?: Accent;
};

const ACCENT_ACTIVE: Record<Accent, string> = {
  sky: "border-sky-400 bg-sky-50 text-sky-900",
  teal: "border-teal-400 bg-teal-50 text-teal-900",
  violet: "border-violet-400 bg-violet-50 text-violet-900",
};

const ACCENT_DOT: Record<Accent, string> = {
  sky: "bg-sky-500",
  teal: "bg-teal-500",
  violet: "bg-violet-500",
};

export function SchoolDistrictHighlightControl({
  label,
  active,
  onToggle,
  compact = false,
  accent = "sky",
}: Props) {
  if (compact) {
    return (
      <label
        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition-colors ${
          active
            ? ACCENT_ACTIVE[accent]
            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
        }`}
      >
        <input
          type="checkbox"
          className="size-3.5 shrink-0 rounded border-zinc-300"
          checked={active}
          onChange={onToggle}
        />
        <span
          className={`size-2 shrink-0 rounded-full ${ACCENT_DOT[accent]} ${active ? "opacity-100" : "opacity-40"}`}
          aria-hidden
        />
        <span className="font-medium">{label}</span>
      </label>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white/95 p-3 shadow-sm backdrop-blur">
      <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-800">
        <input
          type="checkbox"
          className="mt-0.5 size-4 shrink-0 rounded border-zinc-300"
          checked={active}
          onChange={onToggle}
        />
        <span>
          <span className="font-medium">{label}</span>
          <span className="mt-0.5 block text-xs font-normal text-zinc-500">
            町名リストに一致するピンのみ強調（境界の塗りつぶしは未対応）
          </span>
        </span>
      </label>
    </div>
  );
}
