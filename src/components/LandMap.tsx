"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, {
  Layer,
  Marker,
  NavigationControl,
  Popup,
  Source,
  type MapMouseEvent,
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
import type { HazardLayerId, LandListing } from "@/types/land";
import type { MapDataMode, MarketTransaction } from "@/types/market-transaction";
import { LandDetailPanel } from "@/components/LandDetailPanel";
import { ManualLandForm } from "@/components/ManualLandForm";
import { MarketTransactionDetailPanel } from "@/components/MarketTransactionDetailPanel";
import { BaseMapControl } from "@/components/BaseMapControl";
import { MapToolsPanel } from "@/components/MapToolsPanel";
import {
  getLandListingMarkerColor,
  getTransactionMarkerColor,
} from "@/lib/tsubo-unit-price-color";
import {
  findLocationGroupForTransaction,
  groupMarketTransactionsByLocation,
} from "@/lib/market-transaction-groups";
import { transactionMapLabel } from "@/lib/market-transactions-repository";
import {
  ISUZU_JUNIOR_HIGH_SCHOOL_NAME,
  isInIsuzuJuniorHighDistrict,
  resolvedJuniorHighForLand,
} from "@/lib/isuzu-junior-high-district";
import {
  isInShujuuElementaryForLand,
  isInShuudouElementaryForLand,
} from "@/lib/elementary-school-districts";
import { isInShujuuElementaryDistrict } from "@/lib/shujuu-elementary-district";
import { isInShuudouElementaryDistrict } from "@/lib/shuudou-elementary-district";
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
  const [baseMap, setBaseMap] = useState<BaseMapId>(DEFAULT_BASE_MAP);
  const [activeHazards, setActiveHazards] = useState<Set<HazardLayerId>>(
    () => new Set(["flood"]),
  );
  const [toolsOpen, setToolsOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [highlightIsuzuDistrict, setHighlightIsuzuDistrict] = useState(false);
  const [highlightShujuuDistrict, setHighlightShujuuDistrict] = useState(false);
  const [highlightShuudouDistrict, setHighlightShuudouDistrict] = useState(false);
  const [addingLand, setAddingLand] = useState(false);
  const [draftLandLocation, setDraftLandLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [editingLand, setEditingLand] = useState<LandListing | null>(null);
  const [movingPinLand, setMovingPinLand] = useState<LandListing | null>(null);
  const [savingPinLocation, setSavingPinLocation] = useState(false);
  const [manualLands, setManualLands] = useState<LandListing[]>([]);

  const mapRef = useRef<MapRef | null>(null);

  const visibleLands = useMemo(() => {
    const byId = new globalThis.Map<string, LandListing>();
    for (const land of lands) byId.set(land.id, land);
    for (const land of manualLands) byId.set(land.id, land);
    return Array.from(byId.values());
  }, [lands, manualLands]);

  const mappableTransactions = useMemo(
    () =>
      marketTransactions.filter(
        (t) => t.lat != null && t.lng != null,
      ) as (MarketTransaction & { lat: number; lng: number })[],
    [marketTransactions],
  );

  const transactionLocationGroups = useMemo(
    () => groupMarketTransactionsByLocation(mappableTransactions),
    [mappableTransactions],
  );

  const selectedLocationGroup = useMemo(
    () =>
      findLocationGroupForTransaction(
        transactionLocationGroups,
        selectedTransaction,
      ),
    [transactionLocationGroups, selectedTransaction],
  );

  const manualFormOpen =
    dataMode === "listings" && (draftLandLocation != null || editingLand != null);
  const detailOpen =
    manualFormOpen ||
    (dataMode === "listings"
      ? selectedLand != null
      : selectedTransaction != null);

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
    for (const land of visibleLands) {
      colors[land.id] = getLandListingMarkerColor(land);
    }
    return colors;
  }, [visibleLands]);

  const transactionColors = useMemo(() => {
    const colors: Record<string, string> = {};
    for (const group of transactionLocationGroups) {
      const representative = group.transactions[0];
      colors[group.key] = getTransactionMarkerColor(representative);
    }
    return colors;
  }, [transactionLocationGroups]);

  const handleDataModeChange = useCallback((mode: MapDataMode) => {
    setDataMode(mode);
    setSelectedLand(null);
    setSelectedTransaction(null);
    setAddingLand(false);
    setDraftLandLocation(null);
    setEditingLand(null);
    setMovingPinLand(null);
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
    setDraftLandLocation(null);
    setEditingLand(null);
    setMovingPinLand(null);
  }, []);

  const updateLocalLand = useCallback((land: LandListing) => {
    setManualLands((current) => {
      const withoutUpdated = current.filter((item) => item.id !== land.id);
      return [...withoutUpdated, land];
    });
    setSelectedLand(land);
  }, []);

  const handleMapClick = useCallback(
    async (event: MapMouseEvent) => {
      if (dataMode === "listings" && movingPinLand) {
        setSavingPinLocation(true);
        try {
          const response = await fetch("/api/lands", {
            method: "PATCH",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify({
              id: movingPinLand.id,
              lat: event.lngLat.lat,
              lng: event.lngLat.lng,
            }),
          });
          const result = (await response.json()) as {
            land?: LandListing;
            error?: string;
          };

          if (!response.ok || !result.land) {
            throw new Error(result.error ?? "ピン位置の保存に失敗しました。");
          }

          updateLocalLand(result.land);
          setMovingPinLand(null);
        } catch (error) {
          window.alert(
            error instanceof Error
              ? error.message
              : "ピン位置の保存に失敗しました。",
          );
        } finally {
          setSavingPinLocation(false);
        }
        return;
      }

      if (dataMode === "listings" && addingLand) {
        setDraftLandLocation({
          lat: event.lngLat.lat,
          lng: event.lngLat.lng,
        });
        setSelectedLand(null);
        setSelectedTransaction(null);
        setEditingLand(null);
        setMovingPinLand(null);
        setToolsOpen(false);
        return;
      }

      closeDetail();
    },
    [addingLand, closeDetail, dataMode, movingPinLand, updateLocalLand],
  );

  const handleAddLandClick = useCallback(() => {
    setDataMode("listings");
    setSelectedLand(null);
    setSelectedTransaction(null);
    setDraftLandLocation(null);
    setEditingLand(null);
    setMovingPinLand(null);
    setAddingLand((value) => !value);
  }, []);

  const handleManualLandSaved = useCallback((land: LandListing) => {
    updateLocalLand(land);
    setDraftLandLocation(null);
    setEditingLand(null);
    setMovingPinLand(null);
    setAddingLand(false);
  }, [updateLocalLand]);

  const headerSubtitle = (() => {
    if (dataMode === "listings") {
      if (savingPinLocation) return "ピン位置を保存中...";
      if (movingPinLand) return "新しいピン位置をタップ";
      if (addingLand) return "地図をタップして土地を追加";
      return `伊勢市 — 売地 ${visibleLands.length} 件`;
    }

    if (marketTransactions.length === 0) {
      return "五十鈴川駅周辺 — 取引事例なし";
    }

    if (
      mappableTransactions.length < marketTransactions.length ||
      transactionLocationGroups.length < mappableTransactions.length
    ) {
      return `五十鈴川駅周辺 — 取引 ${marketTransactions.length} 件（地図 ${transactionLocationGroups.length} か所）`;
    }

    return `五十鈴川駅周辺 — 取引 ${marketTransactions.length} 件`;
  })();

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

  function markerDistrictRingClass(
    selected: boolean,
    inShujuu: boolean,
    inShuudou: boolean,
    inIsuzu: boolean,
  ): string {
    if (selected) return "border-zinc-900 ring-1 ring-zinc-900/30";
    if (highlightShujuuDistrict && inShujuu) {
      return "border-sky-700 ring-2 ring-sky-400/60";
    }
    if (highlightShuudouDistrict && inShuudou) {
      return "border-teal-700 ring-2 ring-teal-400/60";
    }
    if (highlightIsuzuDistrict && inIsuzu) {
      return "border-violet-700 ring-2 ring-violet-400/60";
    }
    return "border-white";
  }

  function markerDistrictDimmed(
    inShujuu: boolean,
    inShuudou: boolean,
    inIsuzu: boolean,
  ): boolean {
    return (
      (highlightShujuuDistrict && !inShujuu) ||
      (highlightShuudouDistrict && !inShuudou) ||
      (highlightIsuzuDistrict && !inIsuzu)
    );
  }

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
          onClick={handleMapClick}
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
            visibleLands.map((land) => {
              const inShujuu = isInShujuuElementaryForLand(land);
              const inShuudou = isInShuudouElementaryForLand(land);
              const inIsuzu =
                resolvedJuniorHighForLand(land) === ISUZU_JUNIOR_HIGH_SCHOOL_NAME;
              const dimmed = markerDistrictDimmed(inShujuu, inShuudou, inIsuzu);
              const pinSelected = selectedLand?.id === land.id;

              return (
              <Marker
                key={land.id}
                latitude={land.lat}
                longitude={land.lng}
                anchor="bottom"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  setSelectedLand(land);
                  setDraftLandLocation(null);
                  setEditingLand(null);
                  setMovingPinLand(null);
                  setAddingLand(false);
                  setToolsOpen(false);
                }}
              >
                <button
                  type="button"
                  className={`flex size-5 items-center justify-center rounded-full border shadow-md transition-transform active:scale-95 sm:hover:scale-110 ${markerDistrictRingClass(
                    pinSelected,
                    inShujuu,
                    inShuudou,
                    inIsuzu,
                  )} ${dimmed ? "opacity-35" : ""}`}
                  style={{ backgroundColor: landColors[land.id] }}
                  aria-label={land.name}
                >
                  <span className="size-1 rounded-full bg-white" />
                </button>
              </Marker>
            );
            })}

          {draftLandLocation && (
            <Marker
              latitude={draftLandLocation.lat}
              longitude={draftLandLocation.lng}
              anchor="bottom"
            >
              <div
                className="flex size-6 items-center justify-center rounded-full border-2 border-zinc-900 bg-white shadow-lg"
                aria-label="登録予定地"
              >
                <span className="size-2 rounded-full bg-zinc-900" />
              </div>
            </Marker>
          )}

          {dataMode === "reinfolib" &&
            transactionLocationGroups.map((group) => {
              const count = group.transactions.length;
              const representative = group.transactions[0];
              const placeLabel = [
                representative.municipality,
                representative.districtName,
              ]
                .filter(Boolean)
                .join("");
              const inShujuu = isInShujuuElementaryDistrict(placeLabel);
              const inShuudou = isInShuudouElementaryDistrict(placeLabel);
              const inIsuzu = isInIsuzuJuniorHighDistrict(placeLabel);
              const dimmed = markerDistrictDimmed(inShujuu, inShuudou, inIsuzu);
              const groupSelected =
                selectedLocationGroup?.key === group.key;
              const ariaLabel =
                count > 1
                  ? `${transactionMapLabel(representative)}、${count}件`
                  : transactionMapLabel(representative);

              return (
                <Marker
                  key={group.key}
                  latitude={group.lat}
                  longitude={group.lng}
                  anchor="bottom"
                  onClick={(e) => {
                    e.originalEvent.stopPropagation();
                    setSelectedTransaction(representative);
                    setToolsOpen(false);
                  }}
                >
                  <div className="relative">
                    <button
                      type="button"
                      className={`flex size-4 rotate-45 items-center justify-center border shadow-md transition-transform active:scale-95 sm:hover:scale-110 ${markerDistrictRingClass(
                        groupSelected,
                        inShujuu,
                        inShuudou,
                        inIsuzu,
                      )} ${dimmed ? "opacity-35" : ""}`}
                      style={{ backgroundColor: transactionColors[group.key] }}
                      aria-label={ariaLabel}
                    >
                      <span className="size-1 -rotate-45 rounded-full bg-white" />
                    </button>
                    {count > 1 && (
                      <span
                        className="pointer-events-none absolute -right-1.5 -top-1.5 flex min-h-4 min-w-4 items-center justify-center rounded-full border border-white bg-zinc-900 px-0.5 text-[10px] font-semibold leading-none text-white shadow-sm"
                        aria-hidden
                      >
                        {count}
                      </span>
                    )}
                  </div>
                </Marker>
              );
            })}

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
                {(selectedLocationGroup?.transactions.length ?? 0) > 1 && (
                  <p className="text-xs text-zinc-500">
                    この地点 {selectedLocationGroup!.transactions.length} 件
                  </p>
                )}
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

        <div className="absolute right-2 top-14 z-10 sm:right-3 sm:top-16">
          <button
            type="button"
            aria-pressed={addingLand}
            onClick={handleAddLandClick}
            className={`min-h-11 rounded-lg border px-3 text-xs font-semibold shadow-sm backdrop-blur ${
              addingLand
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 bg-white/95 text-zinc-800 hover:bg-zinc-100"
            }`}
          >
            {addingLand ? "追加中" : "土地を追加"}
          </button>
        </div>

        <div className="absolute left-2 top-2 z-10 flex max-w-[calc(100%-5.5rem)] flex-col items-start gap-2 sm:left-3 sm:top-3 lg:max-w-[17.5rem]">
          <button
            type="button"
            className="flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white/95 px-4 text-sm font-medium text-zinc-800 shadow-sm backdrop-blur lg:hidden"
            aria-expanded={toolsOpen}
            aria-label={toolsOpen ? "表示モードを閉じる" : "表示モードを開く"}
            onClick={() => setToolsOpen((open) => !open)}
          >
            {toolsOpen ? "閉じる" : "表示モード"}
          </button>

          <div
            className={`min-w-0 w-[min(calc(100vw-1rem),17.5rem)] overflow-y-auto overscroll-contain sm:w-[min(calc(100vw-1.5rem),17.5rem)] ${
              toolsOpen ? "max-h-[min(75vh,28rem)]" : "hidden"
            } lg:block lg:max-h-[calc(100vh-5rem)] lg:w-[17.5rem]`}
          >
            <MapToolsPanel
              dataMode={dataMode}
              onDataModeChange={handleDataModeChange}
              activeHazards={activeHazards}
              onToggleHazard={toggleHazard}
              highlightShujuuDistrict={highlightShujuuDistrict}
              onToggleShujuuDistrict={() =>
                setHighlightShujuuDistrict((v) => !v)
              }
              highlightShuudouDistrict={highlightShuudouDistrict}
              onToggleShuudouDistrict={() =>
                setHighlightShuudouDistrict((v) => !v)
              }
              highlightIsuzuDistrict={highlightIsuzuDistrict}
              onToggleIsuzuDistrict={() =>
                setHighlightIsuzuDistrict((v) => !v)
              }
            />
          </div>
        </div>

        <header
          className={`pointer-events-none absolute left-2 z-10 max-w-[calc(100%-6rem)] rounded-xl bg-white/90 px-2 py-1.5 shadow-sm backdrop-blur sm:left-3 sm:px-2.5 sm:py-2 ${
            manualFormOpen && !isDesktop
              ? "bottom-[calc(min(72vh,38rem)+0.5rem)]"
              : detailOpen && !isDesktop
              ? "bottom-[calc(min(58vh,28rem)+0.5rem)]"
              : "bottom-12 sm:bottom-3"
          } lg:bottom-3`}
        >
          <div className="flex items-center gap-2">
            <Image
              src="/apple-icon.png"
              alt=""
              width={36}
              height={36}
              className="size-9 rounded-lg"
              priority
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-900 sm:text-sm">
                トチミル
              </p>
              <p className="truncate text-[10px] text-zinc-500 sm:text-xs">
                {headerSubtitle}
              </p>
            </div>
          </div>
        </header>
      </div>

      {manualFormOpen ? (
        <ManualLandForm
          lat={editingLand?.lat ?? draftLandLocation!.lat}
          lng={editingLand?.lng ?? draftLandLocation!.lng}
          land={editingLand ?? undefined}
          onCancel={() => {
            setDraftLandLocation(null);
            setEditingLand(null);
            setAddingLand(false);
          }}
          onSaved={handleManualLandSaved}
        />
      ) : dataMode === "listings" ? (
        <LandDetailPanel
          land={selectedLand}
          onClose={closeDetail}
          onEdit={(land) => {
            setEditingLand(land);
            setAddingLand(false);
            setDraftLandLocation(null);
            setMovingPinLand(null);
          }}
          onMovePin={(land) => {
            setMovingPinLand(land);
            setAddingLand(false);
            setDraftLandLocation(null);
            setEditingLand(null);
          }}
        />
      ) : (
        <MarketTransactionDetailPanel
          transaction={selectedTransaction}
          locationTransactions={selectedLocationGroup?.transactions ?? []}
          onSelectTransaction={setSelectedTransaction}
          dataMode={dataMode}
          onClose={closeDetail}
        />
      )}
    </div>
  );
}
