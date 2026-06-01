"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, {
  Layer,
  Marker,
  NavigationControl,
  Popup,
  Source,
  type MapRef,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

import { ISE_CENTER } from "@/data/lands";
import {
  BASE_MAPS,
  DEFAULT_BASE_MAP,
  DEFAULT_ZOOM,
  HAZARD_ATTRIBUTION,
  HAZARD_LAYERS,
  type BaseMapId,
} from "@/lib/map-config";
import type { ColorMode, HazardLayerId, LandListing } from "@/types/land";
import { HazardLayerToggle } from "@/components/HazardLayerToggle";
import { LandDetailPanel } from "@/components/LandDetailPanel";
import { ColorModeControl } from "@/components/ColorModeControl";
import { BaseMapControl } from "@/components/BaseMapControl";
import { computeLandMetrics } from "@/lib/metrics";
import { getMarkerColor } from "@/lib/color-modes";

type Props = {
  mapboxToken?: string;
  lands: LandListing[];
};

export function LandMap({ mapboxToken, lands }: Props) {
  const [selectedLand, setSelectedLand] = useState<LandListing | null>(null);
  const [colorMode, setColorMode] = useState<ColorMode>("price");
  const [baseMap, setBaseMap] = useState<BaseMapId>(DEFAULT_BASE_MAP);
  const [activeHazards, setActiveHazards] = useState<Set<HazardLayerId>>(
    () => new Set(["flood"]),
  );

  const mapRef = useRef<MapRef | null>(null);

  const applyJapaneseLabels = useCallback(() => {
    const map = mapRef.current?.getMap();
    map?.setLanguage("ja");
  }, []);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    if (map.isStyleLoaded()) {
      applyJapaneseLabels();
    } else {
      map.once("style.load", applyJapaneseLabels);
    }
  }, [baseMap, applyJapaneseLabels]);

  const landColors = useMemo(() => {
    const colors: Record<string, string> = {};
    for (const land of lands) {
      colors[land.id] = getMarkerColor(colorMode, land, computeLandMetrics(land));
    }
    return colors;
  }, [colorMode, lands]);

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
          ref={mapRef}
          mapboxAccessToken={mapboxToken}
          initialViewState={{
            latitude: ISE_CENTER.lat,
            longitude: ISE_CENTER.lng,
            zoom: DEFAULT_ZOOM,
          }}
          style={{ width: "100%", height: "100%" }}
          mapStyle={BASE_MAPS[baseMap].style}
          onLoad={applyJapaneseLabels}
          onClick={() => setSelectedLand(null)}
        >
          <NavigationControl position="bottom-right" />

          {hazardSources.map((layerId) => (
            <Source
              key={layerId}
              id={`hazard-${layerId}`}
              type="raster"
              tiles={HAZARD_LAYERS[layerId].tiles}
              tileSize={256}
              minzoom={HAZARD_LAYERS[layerId].minzoom}
              maxzoom={HAZARD_LAYERS[layerId].maxzoom}
              attribution={HAZARD_ATTRIBUTION}
            >
              <Layer
                id={`hazard-${layerId}-layer`}
                type="raster"
                paint={{
                  "raster-opacity": HAZARD_LAYERS[layerId].opacity,
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
                className={`flex size-8 items-center justify-center rounded-full border-2 shadow-md transition-transform hover:scale-110 ${
                  selectedLand?.id === land.id
                    ? "border-zinc-900 ring-2 ring-zinc-900/30"
                    : "border-white"
                }`}
                style={{ backgroundColor: landColors[land.id] }}
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

        <div className="absolute right-3 top-3 z-10">
          <BaseMapControl baseMap={baseMap} onChange={setBaseMap} />
        </div>

        <div className="absolute left-3 top-3 z-10 flex flex-col gap-2">
          <ColorModeControl mode={colorMode} onChange={setColorMode} />
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
