"use client";

import { useMemo, useState } from "react";

import type { LandListing } from "@/types/land";

type Props = {
  lat: number;
  lng: number;
  land?: LandListing;
  onCancel: () => void;
  onSaved: (land: LandListing) => void;
};

const FIELD_CLASS =
  "w-full rounded-lg border border-zinc-200 px-3 py-2 text-zinc-900 placeholder:text-zinc-400";

export function ManualLandForm({ lat, lng, land, onCancel, onSaved }: Props) {
  const isEditing = land != null;
  const [name, setName] = useState(land?.name ?? "");
  const [address, setAddress] = useState(land?.address ?? "");
  const [price, setPrice] = useState(
    land?.price != null ? String(land.price) : "",
  );
  const [areaSqm, setAreaSqm] = useState(
    land?.areaSqm != null ? String(land.areaSqm) : "",
  );
  const [elevation, setElevation] = useState(
    land?.elevation != null ? String(land.elevation) : "",
  );
  const [sourceUrl, setSourceUrl] = useState(land?.sourceUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const coordinateLabel = useMemo(
    () => `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    [lat, lng],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/lands", {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          id: land?.id,
          name,
          address,
          lat,
          lng,
          price: Number(price),
          areaSqm: areaSqm ? Number(areaSqm) : undefined,
          elevation: elevation ? Number(elevation) : undefined,
          sourceUrl,
        }),
      });

      const result = (await response.json()) as {
        land?: LandListing;
        error?: string;
      };

      if (!response.ok || !result.land) {
        throw new Error(
          result.error ??
            (isEditing ? "土地の更新に失敗しました。" : "土地の登録に失敗しました。"),
        );
      }

      onSaved(result.land);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEditing
            ? "土地の更新に失敗しました。"
            : "土地の登録に失敗しました。",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-20 bg-black/35 lg:hidden"
        aria-label={isEditing ? "土地編集を閉じる" : "土地登録を閉じる"}
        onClick={onCancel}
      />

      <aside
        className="fixed inset-x-0 bottom-0 z-30 flex max-h-[min(72vh,38rem)] flex-col overflow-hidden rounded-t-2xl border-t border-zinc-200 bg-white shadow-2xl lg:static lg:z-auto lg:max-h-none lg:w-72 lg:shrink-0 lg:rounded-none lg:border-l lg:border-t-0 lg:shadow-none xl:w-80"
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? "土地を編集" : "土地を登録"}
      >
        <div className="shrink-0 border-b border-zinc-100 px-4 pb-2 pt-3 lg:border-0 lg:pt-4">
          <div
            className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-300 lg:hidden"
            aria-hidden
          />
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-zinc-900 sm:text-lg">
                {isEditing ? "土地を編集" : "土地を登録"}
              </h2>
              <p className="mt-1 text-xs text-zinc-500">{coordinateLabel}</p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="-mr-1 min-h-11 min-w-11 rounded-lg text-lg text-zinc-500 hover:bg-zinc-100 lg:min-h-0 lg:min-w-0 lg:px-2 lg:py-1 lg:text-sm"
              aria-label="閉じる"
            >
              ×
            </button>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 pb-6 text-sm lg:pb-4"
        >
          <Field label="名前">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              placeholder="伊勢市○○町"
              className={FIELD_CLASS}
            />
          </Field>

          <Field label="価格（万円）">
            <input
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              type="number"
              min="0"
              step="1"
              required
              inputMode="numeric"
              className={FIELD_CLASS}
            />
          </Field>

          <Field label="所在地">
            <input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="未入力なら名前と同じ"
              className={FIELD_CLASS}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="面積（㎡）">
              <input
                value={areaSqm}
                onChange={(event) => setAreaSqm(event.target.value)}
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                className={FIELD_CLASS}
              />
            </Field>

            <Field label="海抜（m）">
              <input
                value={elevation}
                onChange={(event) => setElevation(event.target.value)}
                type="number"
                step="0.1"
                inputMode="decimal"
                className={FIELD_CLASS}
              />
            </Field>
          </div>

          <Field label="不動産情報リンク">
            <input
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              type="url"
              inputMode="url"
              placeholder="https://..."
              className={FIELD_CLASS}
            />
          </Field>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="min-h-11 flex-1 rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "保存中..." : isEditing ? "更新する" : "保存する"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="min-h-11 rounded-lg border border-zinc-200 px-4 py-2 font-medium text-zinc-700"
            >
              キャンセル
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-zinc-600">
        {label}
      </span>
      {children}
    </label>
  );
}
