"use client";

import { useCallback, useMemo, useState } from "react";
import Map, {
  Layer,
  Marker,
  NavigationControl,
  Popup,
  Source,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

import { lands, ISE_CENTER } from "@/data/lands";
import {
  DEFAULT_ZOOM,
  HAZARD_LAYERS,
  MAP_STYLE,
} from "@/lib/map-config";
import type { HazardLayerId, LandListing } from "@/types/land";
import { HazardLayerToggle } from "@/components/HazardLayerToggle";
import { LandDetailPanel } from "@/components/LandDetailPanel";

type Props = {
  mapboxToken?: string;
};

export function LandMap({ mapboxToken }: Props) {
  const [selectedLand, setSelectedLand] = useState<LandListing | null>(null);
  const [activeHazards, setActiveHazards] = useState<Set<HazardLayerId>>(
    () => new Set(["flood"]),
  );

  const toggleHazard = useCallback((layerId: HazardLayerId) => {
    setActiveHazards((prev) => {
      const next = new Set(prev);
      if (next.has(layerId)) {
        next.delete(layerId);
      } else {
        next.add(layerId);
      }
      return next;
    });
  }, []);

  const hazardSources = useMemo(
    () =>
      (Object.keys(HAZARD_LAYERS) as HazardLayerId[]).filter((id) =>
        activeHazards.has(id),
      ),
    [activeHazards],
  );

  if (!mapboxToken) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 p-8 text-center">
        <h1 className="text-2xl font-semibold text-zinc-900">トチミル</h1>
        <p className="max-w-md text-sm text-zinc-600">
          地図を表示するには Mapbox のアクセストークンが必要です。
        </p>
        <code className="rounded bg-zinc-200 px-3 py-2 text-xs">
          NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_token
        </code>
        <p className="text-xs text-zinc-500">
          ローカル: .env.local に設定して dev サーバーを再起動。
          <br />
          Vercel: 環境変数を保存したあと Production を再デプロイしてください。
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1">
      <div className="relative min-h-0 flex-1">
        <Map
          mapboxAccessToken={mapboxToken}
          initialViewState={{
            latitude: ISE_CENTER.lat,
            longitude: ISE_CENTER.lng,
            zoom: DEFAULT_ZOOM,
          }}
          style={{ width: "100%", height: "100%" }}
          mapStyle={MAP_STYLE}
          onClick={() => setSelectedLand(null)}
        >
          <NavigationControl position="top-right" />

          {hazardSources.map((layerId) => (
            <Source
              key={layerId}
              id={`hazard-${layerId}`}
              type="raster"
              tiles={HAZARD_LAYERS[layerId].tiles}
              tileSize={256}
            >
              <Layer
                id={`hazard-${layerId}-layer`}
                type="raster"
                paint={{
                  "raster-opacity": layerId === "flood" ? 0.55 : 0.45,
                }}
              />
            </Source>
          ))}

          {lands.map((land) => (
            <Marker
              key={land.id}
              latitude={land.lat}
              longitude={land.lng}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedLand(land);
              }}
            >
              <button
                type="button"
                className={`flex size-8 items-center justify-center rounded-full border-2 border-white shadow-md transition-transform hover:scale-110 ${
                  selectedLand?.id === land.id
                    ? "bg-emerald-600"
                    : "bg-amber-500"
                }`}
                aria-label={land.name}
              >
                <span className="size-2 rounded-full bg-white" />
              </button>
            </Marker>
          ))}

          {selectedLand && (
            <Popup
              latitude={selectedLand.lat}
              longitude={selectedLand.lng}
              anchor="top"
              closeOnClick={false}
              onClose={() => setSelectedLand(null)}
            >
              <div className="text-sm">
                <p className="font-semibold">{selectedLand.name}</p>
                <p className="text-emerald-700">
                  {selectedLand.price.toLocaleString()} 万円
                </p>
              </div>
            </Popup>
          )}
        </Map>

        <div className="absolute left-3 top-3 z-10">
          <HazardLayerToggle
            activeLayers={activeHazards}
            onToggle={toggleHazard}
          />
        </div>

        <header className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-lg bg-white/90 px-3 py-2 shadow-sm backdrop-blur">
          <p className="text-sm font-semibold text-zinc-900">トチミル</p>
          <p className="text-xs text-zinc-500">伊勢市 — 売地 {lands.length} 件</p>
        </header>
      </div>

      <LandDetailPanel
        land={selectedLand}
        onClose={() => setSelectedLand(null)}
      />
    </div>
  );
}
