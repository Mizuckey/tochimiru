"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

export type AddressSearchPlace = {
  id: string;
  name: string;
  fullAddress: string;
  featureType: string | null;
  accuracy: string | null;
  lat: number;
  lng: number;
};

type GeocodeResponse =
  | {
      ok: true;
      results: AddressSearchPlace[];
    }
  | {
      ok: false;
      results: [];
      error: string;
    };

type Props = {
  onSelect: (place: AddressSearchPlace) => void;
  getProximity: () => { lat: number; lng: number } | null;
};

export function AddressSearchControl({ onSelect, getProximity }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AddressSearchPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  async function search(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setError(null);
      return;
    }

    abortRef.current?.abort();
    const abortController = new AbortController();
    abortRef.current = abortController;

    const params = new URLSearchParams({ q: trimmed });
    const proximity = getProximity();
    if (proximity) {
      params.set("proximity", `${proximity.lng},${proximity.lat}`);
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/geocode?${params}`, {
        signal: abortController.signal,
      });
      const data = (await response.json()) as GeocodeResponse;

      if (!data.ok) {
        setResults([]);
        setError(data.error);
        return;
      }

      setResults(data.results);
      setError(data.results.length === 0 ? "候補が見つかりませんでした。" : null);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setResults([]);
      setError("住所検索に失敗しました。");
    } finally {
      if (abortRef.current === abortController) {
        abortRef.current = null;
        setLoading(false);
      }
    }
  }

  function selectPlace(place: AddressSearchPlace) {
    setQuery(place.fullAddress);
    setResults([]);
    setError(null);
    onSelect(place);
  }

  return (
    <div className="w-[min(calc(100vw-8rem),22rem)] sm:w-[22rem]">
      <form
        onSubmit={search}
        className="flex min-h-11 overflow-hidden rounded-lg border border-zinc-200 bg-white/95 shadow-sm backdrop-blur"
      >
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            if (!event.target.value.trim()) {
              setResults([]);
              setError(null);
            }
          }}
          className="min-w-0 flex-1 bg-transparent px-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
          placeholder="住所・地名を検索"
          aria-label="住所・地名を検索"
          autoComplete="street-address"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className={`w-16 shrink-0 text-sm font-semibold transition-colors ${
            loading || !query.trim()
              ? "bg-zinc-100 text-zinc-400"
              : "bg-zinc-900 text-white hover:bg-zinc-700"
          }`}
        >
          {loading ? "検索中" : "検索"}
        </button>
      </form>

      {(results.length > 0 || error) && (
        <div className="mt-1 overflow-hidden rounded-lg border border-zinc-200 bg-white/95 text-sm shadow-md backdrop-blur">
          {error && (
            <p className="px-3 py-2 text-xs leading-snug text-zinc-500">
              {error}
            </p>
          )}
          {results.map((place) => (
            <button
              key={place.id}
              type="button"
              onClick={() => selectPlace(place)}
              className="block w-full border-t border-zinc-100 px-3 py-2 text-left first:border-t-0 hover:bg-zinc-50"
            >
              <span className="block truncate text-xs font-semibold text-zinc-900">
                {place.name}
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-zinc-500">
                {place.fullAddress}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
