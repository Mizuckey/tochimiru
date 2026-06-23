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
import type {
  MapDataMode,
  MarketTransaction,
  TransactionColorMode,
} from "@/types/market-transaction";
import { HazardLayerToggle } from "@/components/HazardLayerToggle";
import { LandDetailPanel } from "@/components/LandDetailPanel";
import { MarketTransactionDetailPanel } from "@/components/MarketTransactionDetailPanel";
import { ColorModeControl } from "@/components/ColorModeControl";
import { TransactionColorModeControl } from "@/components/TransactionColorModeControl";
import { DataModeControl } from "@/components/DataModeControl";
import { BaseMapControl } from "@/components/BaseMapControl";
import { computeLandMetrics } from "@/lib/metrics";
import { getMarkerColor } from "@/lib/color-modes";
import { getTransactionMarkerColor } from "@/lib/transaction-color-modes";
import { transactionMapLabel } from "@/lib/market-transactions-repository";

type Props = {
  mapboxToken?: string;
  lands: LandListing[];
  marketTransactions: MarketTransaction[];
};

export function LandMap({ mapboxToken, lands, marketTransactions }: Props) {
  const [dataMode, setDataMode] = useState<MapDataMode>("listings");
  const [selectedLand, setSelectedLand] = useState<LandListing | null>(null);
  const [selectedTransaction, setSelectedTransaction] =
    useState<MarketTransaction | null>(null);
  const [colorMode, setColorMode] = useState<ColorMode>("price");
  const [transactionColorMode, setTransactionColorMode] =
    useState<TransactionColorMode>("unitPrice");
  const [baseMap, setBaseMap] = useState<BaseMapId>(DEFAULT_BASE_MAP);
  const [activeHazards, setActiveHazards] = useState<Set<HazardLayerId>>(
    () => new Set(["flood"]),
  );
  const [toolsOpen, setToolsOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  const mapRef = useRef<MapRef | null>(null);

  const mappableTransactions = useMemo(
    () =>
      marketTransactions.filter(
        (t) => t.lat != null && t.lng != null,
      ) as (MarketTransaction & { lat: number; lng: number })[],
    [marketTransactions],
  );

  const detailOpen =
    dataMode === "listings" ? selectedLand != null : selectedTransaction != null;

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!detailOpen || isDesktop) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [detailOpen, isDesktop]);

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

  const transactionColors = useMemo(() => {
    const colors: Record<string, string> = {};
    for (const transaction of mappableTransactions) {
      colors[transaction.id] = getTransactionMarkerColor(
        transactionColorMode,
        transaction,
      );
    }
    return colors;
  }, [transactionColorMode, mappableTransactions]);

  const handleDataModeChange = useCallback((mode: MapDataMode) => {
    setDataMode(mode);
    setSelectedLand(null);
    setSelectedTransaction(null);
  }, []);

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

  const closeDetail = useCallback(() => {
    setSelectedLand(null);
    setSelectedTransaction(null);
  }, []);

  const headerSubtitle =
    dataMode === "listings"
      ? `伊勢市 — 売地 ${lands.length} 件`
      : marketTransactions.length === 0
        ? "五十鈴川駅周辺 — 取引事例なし"
        : mappableTransactions.length < marketTransactions.length
          ? `五十鈴川駅周辺 — 取引 ${marketTransactions.length} 件（地図 ${mappableTransactions.length} 件）`
          : `五十鈴川駅周辺 — 取引 ${marketTransactions.length} 件`;

  if (!mapboxToken) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 p-6 text-center sm:p-8">
        <h1 className="text-xl font-semibold text-zinc-900 sm:text-2xl">
          トチミル
        </h1>
        <p className="max-w-md text-sm text-zinc-600">
          地図を表示するには Mapbox のアクセストークンが必要です。
        </p>
        <code className="max-w-full overflow-x-auto rounded bg-zinc-200 px-3 py-2 text-xs">
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

  const mapTools = (
    <>
      <DataModeControl mode={dataMode} onChange={handleDataModeChange} />
      {dataMode === "listings" ? (
        <ColorModeControl mode={colorMode} onChange={setColorMode} />
      ) : (
        <TransactionColorModeControl
          mode={transactionColorMode}
          onChange={setTransactionColorMode}
        />
      )}
      <HazardLayerToggle
        activeLayers={activeHazards}
        onToggle={toggleHazard}
      />
    </>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <div
        className={`relative min-h-0 flex-1 ${
          detailOpen && !isDesktop ? "min-h-[42vh]" : "min-h-[50vh]"
        } lg:min-h-0`}
      >
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
          onClick={closeDetail}
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

          {dataMode === "listings" &&
            lands.map((land) => (
              <Marker
                key={land.id}
                latitude={land.lat}
                longitude={land.lng}
                anchor="bottom"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  setSelectedLand(land);
                  setToolsOpen(false);
                }}
              >
                <button
                  type="button"
                  className={`flex size-5 items-center justify-center rounded-full border shadow-md transition-transform active:scale-95 sm:hover:scale-110 ${
                    selectedLand?.id === land.id
                      ? "border-zinc-900 ring-1 ring-zinc-900/30"
                      : "border-white"
                  }`}
                  style={{ backgroundColor: landColors[land.id] }}
                  aria-label={land.name}
                >
                  <span className="size-1 rounded-full bg-white" />
                </button>
              </Marker>
            ))}

          {dataMode === "reinfolib" &&
            mappableTransactions.map((transaction) => (
              <Marker
                key={transaction.id}
                latitude={transaction.lat}
                longitude={transaction.lng}
                anchor="bottom"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  setSelectedTransaction(transaction);
                  setToolsOpen(false);
                }}
              >
                <button
                  type="button"
                  className={`flex size-4 rotate-45 items-center justify-center border shadow-md transition-transform active:scale-95 sm:hover:scale-110 ${
                    selectedTransaction?.id === transaction.id
                      ? "border-zinc-900 ring-1 ring-zinc-900/30"
                      : "border-white"
                  }`}
                  style={{ backgroundColor: transactionColors[transaction.id] }}
                  aria-label={transactionMapLabel(transaction)}
                >
                  <span className="size-1 -rotate-45 rounded-full bg-white" />
                </button>
              </Marker>
            ))}

          {dataMode === "listings" && selectedLand && isDesktop && (
            <Popup
              latitude={selectedLand.lat}
              longitude={selectedLand.lng}
              anchor="top"
              closeOnClick={false}
              onClose={closeDetail}
            >
              <div className="text-sm">
                <p className="font-semibold">{selectedLand.name}</p>
                <p className="text-emerald-700">
                  {selectedLand.price.toLocaleString()} 万円
                </p>
              </div>
            </Popup>
          )}

          {dataMode === "reinfolib" && selectedTransaction && isDesktop && (
            <Popup
              latitude={selectedTransaction.lat!}
              longitude={selectedTransaction.lng!}
              anchor="top"
              closeOnClick={false}
              onClose={closeDetail}
            >
              <div className="text-sm">
                <p className="font-semibold">
                  {transactionMapLabel(selectedTransaction)}
                </p>
                {selectedTransaction.tradePriceYen != null && (
                  <p className="text-emerald-700">
                    {selectedTransaction.tradePriceYen.toLocaleString()} 円
                  </p>
                )}
              </div>
            </Popup>
          )}
        </Map>

        <div className="absolute right-2 top-2 z-10 sm:right-3 sm:top-3">
          <BaseMapControl baseMap={baseMap} onChange={setBaseMap} />
        </div>

        <div className="absolute left-2 top-2 z-10 flex max-w-[calc(100%-5rem)] flex-col gap-2 sm:left-3 sm:top-3 sm:max-w-[min(100%,20rem)]">
          <button
            type="button"
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white/95 px-4 text-sm font-medium text-zinc-800 shadow-sm backdrop-blur lg:hidden"
            aria-expanded={toolsOpen}
            onClick={() => setToolsOpen((open) => !open)}
          >
            {toolsOpen ? "地図ツールを閉じる" : "地図ツール"}
          </button>

          <div
            className={`flex flex-col gap-2 overflow-y-auto overscroll-contain ${
              toolsOpen ? "max-h-[min(50vh,20rem)]" : "hidden"
            } lg:flex lg:max-h-[calc(100vh-6rem)]`}
          >
            {mapTools}
          </div>
        </div>

        <header
          className={`pointer-events-none absolute left-2 z-10 max-w-[calc(100%-6rem)] rounded-lg bg-white/90 px-2.5 py-1.5 shadow-sm backdrop-blur sm:left-3 sm:px-3 sm:py-2 ${
            detailOpen && !isDesktop
              ? "bottom-[calc(min(58vh,28rem)+0.5rem)]"
              : "bottom-2 sm:bottom-3"
          } lg:bottom-3`}
        >
          <p className="text-xs font-semibold text-zinc-900 sm:text-sm">
            トチミル
          </p>
          <p className="text-[10px] text-zinc-500 sm:text-xs">{headerSubtitle}</p>
        </header>
      </div>

      {dataMode === "listings" ? (
        <LandDetailPanel land={selectedLand} onClose={closeDetail} />
      ) : (
        <MarketTransactionDetailPanel
          transaction={selectedTransaction}
          dataMode={dataMode}
          onClose={closeDetail}
        />
      )}
    </div>
  );
}
