import { TSUBO_UNIT_PRICE_LEGEND } from "@/lib/tsubo-unit-price-color";

type Props = {
  embedded?: boolean;
};

export function MapColorLegend({ embedded }: Props) {
  const body = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        色分け（坪単価）
      </p>
      <ul className="flex flex-col gap-0.5">
        {TSUBO_UNIT_PRICE_LEGEND.map((item) => (
          <li
            key={item.label}
            className="flex items-center gap-2 text-[11px] text-zinc-700"
          >
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
