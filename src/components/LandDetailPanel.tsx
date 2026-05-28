import type { LandListing } from "@/types/land";

type Props = {
  land: LandListing | null;
  onClose: () => void;
};

export function LandDetailPanel({ land, onClose }: Props) {
  if (!land) {
    return (
      <aside className="flex w-80 shrink-0 flex-col border-l border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">トチミル</h2>
        <p className="mt-2 text-sm text-zinc-600">
          地図のピンをクリックすると、土地の情報が表示されます。
        </p>
        <p className="mt-4 text-xs text-zinc-400">Phase 0 — 伊勢市エリア</p>
      </aside>
    );
  }

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-zinc-200 bg-white p-4">
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
        <div>
          <dt className="text-zinc-500">座標</dt>
          <dd className="font-mono text-xs text-zinc-700">
            {land.lat.toFixed(4)}, {land.lng.toFixed(4)}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">メモ</dt>
          <dd className="text-zinc-800">{land.memo}</dd>
        </div>
      </dl>
    </aside>
  );
}
