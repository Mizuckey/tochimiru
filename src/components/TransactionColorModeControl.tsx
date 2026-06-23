import type { TransactionColorMode } from "@/types/market-transaction";
import { TRANSACTION_COLOR_MODES } from "@/lib/transaction-color-modes";

type Props = {
  mode: TransactionColorMode;
  onChange: (mode: TransactionColorMode) => void;
};

export function TransactionColorModeControl({ mode, onChange }: Props) {
  const config = TRANSACTION_COLOR_MODES[mode];

  return (
    <div className="flex w-full max-w-full flex-col gap-2 rounded-lg border border-zinc-200 bg-white/95 p-3 shadow-sm backdrop-blur sm:max-w-xs">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        色分け
      </p>
      <div className="flex flex-wrap gap-1">
        {(Object.keys(TRANSACTION_COLOR_MODES) as TransactionColorMode[]).map(
          (id) => (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                mode === id
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              {TRANSACTION_COLOR_MODES[id].label}
            </button>
          ),
        )}
      </div>
      <ul className="mt-1 flex flex-col gap-1">
        {config.legend.map((item) => (
          <li
            key={item.label}
            className="flex items-center gap-2 text-xs text-zinc-700"
          >
            <span
              className="size-3 rounded-full border border-white shadow"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
