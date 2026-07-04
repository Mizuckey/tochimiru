"use client";

import Image from "next/image";
import type { MapboxGeoJSONFeature } from "mapbox-gl";
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
import type { HazardLayerId } from "@/types/land";
import type { MarketTransaction } from "@/types/market-transaction";
import { MarketTransactionDetailPanel } from "@/components/MarketTransactionDetailPanel";
import { BaseMapControl } from "@/components/BaseMapControl";
import { MapToolsPanel } from "@/components/MapToolsPanel";
import {
  AddressSearchControl,
  type AddressSearchPlace,
} from "@/components/AddressSearchControl";
import { getTransactionMarkerColor } from "@/lib/tsubo-unit-price-color";
import {
  findLocationGroupForTransaction,
  groupMarketTransactionsByLocation,
} from "@/lib/market-transaction-groups";
import { transactionMapLabel } from "@/lib/market-transactions-repository";
import { isInIsuzuJuniorHighDistrict } from "@/lib/isuzu-junior-high-district";
import { isInShujuuElementaryDistrict } from "@/lib/shujuu-elementary-district";
import { isInShuudouElementaryDistrict } from "@/lib/shuudou-elementary-district";
import {
  applySurfaceSoilToMeshCell,
  createSurfaceSoilMeshForBounds,
  emptySurfaceSoilMesh,
  getNeighborMeshCells,
  markSurfaceSoilMeshCellUnavailable,
  surfaceSoilMeshColor,
  type SurfaceSoilMeshCell,
  type SurfaceSoilMeshFeatureCollection,
  type SurfaceSoilMeshCellProperties,
} from "@/lib/surface-soil-mesh";
import type { SurfaceSoilResult } from "@/types/jshis-surface-soil";
type Props = {
  mapboxToken?: string;
  marketTransactions: MarketTransaction[];
};

const SURFACE_SOIL_MESH_FILL_LAYER_ID = "surface-soil-mesh-fill";
const SURFACE_SOIL_MESH_SELECTED_LAYER_ID = "surface-soil-mesh-selected";
const JSHIS_MESH_FETCH_CONCURRENCY = 4;
const SURFACE_SOIL_MESH_MIN_ZOOM = 14;
const SURFACE_SOIL_MESH_FETCH_LIMIT = 225;
const SURFACE_SOIL_MESH_DISPLAY_LIMIT = 1_200;

type MapClickEvent = MapMouseEvent & {
  features?: MapboxGeoJSONFeature[];
};

function formatNullableNumber(value: number | null, unit = "") {
  if (value == null) return "-";
  return `${value.toLocaleString()}${unit}`;
}

export function LandMap({ mapboxToken, marketTransactions }: Props) {
  const [selectedTransaction, setSelectedTransaction] =
    useState<MarketTransaction | null>(null);
  const [baseMap, setBaseMap] = useState<BaseMapId>(DEFAULT_BASE_MAP);
  const [activeHazards, setActiveHazards] = useState<Set<HazardLayerId>>(
    () => new Set(["flood"]),
  );
  const [toolsOpen, setToolsOpen] = useState(false);
  const [iseModeEnabled, setIseModeEnabled] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [highlightIsuzuDistrict, setHighlightIsuzuDistrict] = useState(false);
  const [highlightShujuuDistrict, setHighlightShujuuDistrict] = useState(false);
  const [highlightShuudouDistrict, setHighlightShuudouDistrict] = useState(false);
  const [surfaceSoilMeshVisible, setSurfaceSoilMeshVisible] = useState(true);
  const [surfaceSoilMesh, setSurfaceSoilMesh] =
    useState<SurfaceSoilMeshFeatureCollection>(() => emptySurfaceSoilMesh());
  const [surfaceSoilMeshCache, setSurfaceSoilMeshCache] = useState<
    Record<string, SurfaceSoilMeshCell>
  >({});
  const [surfaceSoilMeshLoading, setSurfaceSoilMeshLoading] = useState(false);
  const [surfaceSoilMeshFetchTotal, setSurfaceSoilMeshFetchTotal] = useState(0);
  const [surfaceSoilMeshFetchedCount, setSurfaceSoilMeshFetchedCount] =
    useState(0);
  const [currentZoom, setCurrentZoom] = useState(DEFAULT_ZOOM);
  const [selectedSearchPlace, setSelectedSearchPlace] =
    useState<AddressSearchPlace | null>(null);
  const [selectedMeshCellId, setSelectedMeshCellId] = useState<string | null>(
    null,
  );

  const mapRef = useRef<MapRef | null>(null);

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

  const detailOpen = iseModeEnabled && selectedTransaction != null;

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

  const transactionColors = useMemo(() => {
    const colors: Record<string, string> = {};
    for (const group of transactionLocationGroups) {
      const representative = group.transactions[0];
      colors[group.key] = getTransactionMarkerColor(representative);
    }
    return colors;
  }, [transactionLocationGroups]);

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
    setSelectedTransaction(null);
  }, []);

  const refreshVisibleSurfaceSoilMesh = useCallback(
    (zoom = currentZoom) => {
      const map = mapRef.current?.getMap();
      if (!map || !surfaceSoilMeshVisible || zoom < SURFACE_SOIL_MESH_MIN_ZOOM) {
        setSurfaceSoilMesh(emptySurfaceSoilMesh());
        return;
      }

      const bounds = map.getBounds();
      if (!bounds) {
        setSurfaceSoilMesh(emptySurfaceSoilMesh());
        return;
      }

      const generatedMesh = createSurfaceSoilMeshForBounds({
        west: bounds.getWest(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        north: bounds.getNorth(),
      });

      if (generatedMesh.features.length > SURFACE_SOIL_MESH_DISPLAY_LIMIT) {
        setSurfaceSoilMesh(emptySurfaceSoilMesh());
        return;
      }

      setSurfaceSoilMesh({
        ...generatedMesh,
        features: generatedMesh.features.map(
          (feature) => surfaceSoilMeshCache[feature.properties.id] ?? feature,
        ),
      });
    },
    [currentZoom, surfaceSoilMeshCache, surfaceSoilMeshVisible],
  );

  useEffect(() => {
    refreshVisibleSurfaceSoilMesh();
  }, [refreshVisibleSurfaceSoilMesh]);

  const handleMapLoad = useCallback(() => {
    applyJapaneseLabels();
    const map = mapRef.current?.getMap();
    if (!map) return;
    const zoom = map.getZoom();
    setCurrentZoom(zoom);
    refreshVisibleSurfaceSoilMesh(zoom);
  }, [applyJapaneseLabels, refreshVisibleSurfaceSoilMesh]);

  const selectedMeshCell = useMemo(() => {
    if (!selectedMeshCellId) return null;
    return (
      surfaceSoilMesh.features.find(
        (feature) => feature.properties.id === selectedMeshCellId,
      )?.properties ?? null
    );
  }, [selectedMeshCellId, surfaceSoilMesh]);

  const selectedMeshNeighbors = useMemo(() => {
    if (!selectedMeshCell) return [];
    return getNeighborMeshCells(surfaceSoilMesh, selectedMeshCell).filter(
      (cell) => cell.properties.source === "j-shis",
    );
  }, [selectedMeshCell, surfaceSoilMesh]);

  const selectedMeshNeighborAverage = useMemo(() => {
    if (selectedMeshNeighbors.length === 0) return null;
    const total = selectedMeshNeighbors.reduce(
      (sum, cell) => sum + (cell.properties.score ?? 0),
      0,
    );
    return total / selectedMeshNeighbors.length;
  }, [selectedMeshNeighbors]);

  const surfaceSoilMeshLoadedCount = useMemo(
    () =>
      surfaceSoilMesh.features.filter(
        (feature) => feature.properties.source === "j-shis",
      ).length,
    [surfaceSoilMesh],
  );

  const surfaceSoilMeshFailedCount = useMemo(
    () =>
      surfaceSoilMesh.features.filter(
        (feature) => feature.properties.source === "unavailable",
      ).length,
    [surfaceSoilMesh],
  );

  const surfaceSoilMeshFetchCandidates = useMemo(() => {
    if (!surfaceSoilMeshVisible || currentZoom < SURFACE_SOIL_MESH_MIN_ZOOM) {
      return [];
    }

    return surfaceSoilMesh.features
      .filter((feature) => feature.properties.source !== "j-shis")
      .slice(0, SURFACE_SOIL_MESH_FETCH_LIMIT);
  }, [currentZoom, surfaceSoilMesh, surfaceSoilMeshVisible]);

  const canFetchSurfaceSoilMesh =
    surfaceSoilMeshVisible &&
    currentZoom >= SURFACE_SOIL_MESH_MIN_ZOOM &&
    !surfaceSoilMeshLoading &&
    surfaceSoilMeshFetchCandidates.length > 0;

  const fetchSurfaceSoilMeshCells = useCallback(
    async (targets: SurfaceSoilMeshCell[]) => {
      if (targets.length === 0) return;

      let cursor = 0;

      setSurfaceSoilMeshLoading(true);
      setSurfaceSoilMeshFetchTotal(targets.length);
      setSurfaceSoilMeshFetchedCount(0);

      async function fetchCell(target: SurfaceSoilMeshCell) {
        const params = new URLSearchParams({
          lat: String(target.properties.centerLat),
          lng: String(target.properties.centerLng),
        });
        const response = await fetch(`/api/jshis/surface-soil?${params}`);
        const result = (await response.json()) as SurfaceSoilResult;
        const nextCell = result.ok
          ? applySurfaceSoilToMeshCell(target, result.data)
          : markSurfaceSoilMeshCellUnavailable(target, result.error.message);

        setSurfaceSoilMeshCache((prev) => ({
          ...prev,
          [target.properties.id]: nextCell,
        }));

        setSurfaceSoilMesh((prev) => ({
          ...prev,
          features: prev.features.map((feature) => {
            if (feature.properties.id !== target.properties.id) return feature;
            return nextCell;
          }),
        }));

        setSurfaceSoilMeshFetchedCount((count) => count + 1);
      }

      async function worker() {
        while (true) {
          const index = cursor;
          cursor += 1;
          const target = targets[index];
          if (!target) return;

          try {
            await fetchCell(target);
          } catch (error) {
            const nextCell = markSurfaceSoilMeshCellUnavailable(
              target,
              error instanceof Error
                ? error.message
                : "J-SHIS 表層地盤情報を取得できませんでした。",
            );

            setSurfaceSoilMeshCache((prev) => ({
              ...prev,
              [target.properties.id]: nextCell,
            }));
            setSurfaceSoilMesh((prev) => ({
              ...prev,
              features: prev.features.map((feature) =>
                feature.properties.id === target.properties.id
                  ? nextCell
                  : feature,
              ),
            }));
            setSurfaceSoilMeshFetchedCount((count) => count + 1);
          }
        }
      }

      try {
        await Promise.all(
          Array.from(
            { length: Math.min(JSHIS_MESH_FETCH_CONCURRENCY, targets.length) },
            () => worker(),
          ),
        );
      } finally {
        setSurfaceSoilMeshLoading(false);
      }
    },
    [],
  );

  const fetchVisibleSurfaceSoilMesh = useCallback(() => {
    if (!canFetchSurfaceSoilMesh) return;
    void fetchSurfaceSoilMeshCells(surfaceSoilMeshFetchCandidates);
  }, [
    canFetchSurfaceSoilMesh,
    fetchSurfaceSoilMeshCells,
    surfaceSoilMeshFetchCandidates,
  ]);

  const getSearchProximity = useCallback(() => {
    const center = mapRef.current?.getMap().getCenter();
    if (!center) return null;
    return { lat: center.lat, lng: center.lng };
  }, []);

  const selectSearchPlace = useCallback((place: AddressSearchPlace) => {
    setSelectedSearchPlace(place);
    setSelectedTransaction(null);
    setSelectedMeshCellId(null);
    setToolsOpen(false);
    mapRef.current?.flyTo({
      center: [place.lng, place.lat],
      zoom: Math.max(mapRef.current.getZoom(), 15.5),
      essential: true,
    });
  }, []);

  const headerSubtitle = (() => {
    if (!iseModeEnabled) {
      return "全国モード — ハザード・地盤を確認";
    }

    if (marketTransactions.length === 0) {
      return "伊勢モード — 五十鈴川駅周辺 — 取引事例なし";
    }

    if (
      mappableTransactions.length < marketTransactions.length ||
      transactionLocationGroups.length < mappableTransactions.length
    ) {
      return `伊勢モード — 五十鈴川駅周辺 — 取引 ${marketTransactions.length} 件（地図 ${transactionLocationGroups.length} か所）`;
    }

    return `伊勢モード — 五十鈴川駅周辺 — 取引 ${marketTransactions.length} 件`;
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

  function handleMapClick(event: MapClickEvent) {
    const meshFeature = event.features?.find(
      (feature) => feature.layer?.id === SURFACE_SOIL_MESH_FILL_LAYER_ID,
    );

    if (meshFeature?.properties) {
      const properties = meshFeature.properties as SurfaceSoilMeshCellProperties;
      setSelectedMeshCellId(properties.id);
      setSelectedTransaction(null);
      setToolsOpen(false);
      return;
    }

    setSelectedMeshCellId(null);
    closeDetail();
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
          onLoad={handleMapLoad}
          onClick={handleMapClick}
          onMove={(event) => {
            setCurrentZoom(event.viewState.zoom);
          }}
          onMoveEnd={(event) => {
            setCurrentZoom(event.viewState.zoom);
            refreshVisibleSurfaceSoilMesh(event.viewState.zoom);
          }}
          interactiveLayerIds={
            surfaceSoilMeshVisible ? [SURFACE_SOIL_MESH_FILL_LAYER_ID] : []
          }
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

          {surfaceSoilMeshVisible && (
            <Source
              id="surface-soil-mesh"
              type="geojson"
              data={surfaceSoilMesh}
            >
              <Layer
                id={SURFACE_SOIL_MESH_FILL_LAYER_ID}
                type="fill"
                minzoom={SURFACE_SOIL_MESH_MIN_ZOOM}
                paint={{
                  "fill-color": [
                    "case",
                    ["!=", ["get", "source"], "j-shis"],
                    "#a1a1aa",
                    [
                      "match",
                      ["get", "score"],
                      1,
                      surfaceSoilMeshColor(1),
                      2,
                      surfaceSoilMeshColor(2),
                      3,
                      surfaceSoilMeshColor(3),
                      4,
                      surfaceSoilMeshColor(4),
                      5,
                      surfaceSoilMeshColor(5),
                      "#a1a1aa",
                    ],
                  ],
                  "fill-opacity": [
                    "case",
                    ["==", ["get", "id"], selectedMeshCell?.id ?? ""],
                    [
                      "case",
                      ["==", ["get", "source"], "j-shis"],
                      0.62,
                      0.3,
                    ],
                    [
                      "case",
                      ["==", ["get", "source"], "j-shis"],
                      0.38,
                      0.14,
                    ],
                  ],
                }}
              />
              <Layer
                id="surface-soil-mesh-line"
                type="line"
                minzoom={SURFACE_SOIL_MESH_MIN_ZOOM}
                paint={{
                  "line-color": "rgba(24, 24, 27, 0.46)",
                  "line-width": [
                    "case",
                    ["==", ["get", "id"], selectedMeshCell?.id ?? ""],
                    1.4,
                    0.65,
                  ],
                }}
              />
              <Layer
                id={SURFACE_SOIL_MESH_SELECTED_LAYER_ID}
                type="line"
                minzoom={SURFACE_SOIL_MESH_MIN_ZOOM}
                filter={[
                  "==",
                  ["get", "id"],
                  selectedMeshCell?.id ?? "__none__",
                ]}
                paint={{
                  "line-color": "#111827",
                  "line-width": 2.5,
                }}
              />
            </Source>
          )}

          {selectedSearchPlace && (
            <>
              <Marker
                latitude={selectedSearchPlace.lat}
                longitude={selectedSearchPlace.lng}
                anchor="bottom"
              >
                <div className="relative flex flex-col items-center">
                  <span className="size-4 rounded-full border-2 border-white bg-sky-600 shadow-md" />
                  <span className="-mt-1 h-3 w-0.5 bg-sky-600 shadow-sm" />
                </div>
              </Marker>
              <Popup
                latitude={selectedSearchPlace.lat}
                longitude={selectedSearchPlace.lng}
                anchor="top"
                closeOnClick={false}
                onClose={() => setSelectedSearchPlace(null)}
              >
                <div className="max-w-56 text-sm">
                  <p className="font-semibold text-zinc-900">
                    {selectedSearchPlace.name}
                  </p>
                  <p className="mt-1 text-xs leading-snug text-zinc-500">
                    {selectedSearchPlace.fullAddress}
                  </p>
                </div>
              </Popup>
            </>
          )}

          {iseModeEnabled && transactionLocationGroups.map((group) => {
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
                  setSelectedMeshCellId(null);
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

          {iseModeEnabled && selectedTransaction && isDesktop && (
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

          {selectedMeshCell && (
            <Popup
              latitude={selectedMeshCell.centerLat}
              longitude={selectedMeshCell.centerLng}
              anchor="top"
              closeOnClick={false}
              onClose={() => setSelectedMeshCellId(null)}
            >
              <div className="w-56 text-sm">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-zinc-900">
                      250m地盤メッシュ
                    </p>
                    <p className="text-xs text-zinc-500">
                      {selectedMeshCell.source === "j-shis"
                        ? selectedMeshCell.geomorphologyName
                        : selectedMeshCell.source === "unavailable"
                          ? "取得失敗"
                          : "未取得"}
                    </p>
                  </div>
                  {selectedMeshCell.source === "j-shis" &&
                    selectedMeshCell.score != null &&
                    selectedMeshCell.label != null && (
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                        style={{
                          backgroundColor: surfaceSoilMeshColor(
                            selectedMeshCell.score,
                          ),
                        }}
                      >
                        {selectedMeshCell.label}
                      </span>
                    )}
                </div>
                {selectedMeshCell.source === "j-shis" ? (
                  <>
                    <p className="text-xs leading-relaxed text-zinc-600">
                      {selectedMeshCell.summary}
                    </p>
                    <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      <div>
                        <dt className="text-zinc-400">AVS30</dt>
                        <dd className="font-medium text-zinc-700">
                          {formatNullableNumber(selectedMeshCell.avs30, " m/s")}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-zinc-400">増幅率</dt>
                        <dd className="font-medium text-zinc-700">
                          {formatNullableNumber(
                            selectedMeshCell.amplificationFactor,
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-zinc-400">周辺平均</dt>
                        <dd className="font-medium text-zinc-700">
                          {selectedMeshNeighborAverage?.toFixed(1) ?? "-"} / 5
                        </dd>
                      </div>
                      <div>
                        <dt className="text-zinc-400">比較</dt>
                        <dd className="font-medium text-zinc-700">
                          {selectedMeshNeighborAverage == null ||
                          selectedMeshCell.score == null
                            ? "-"
                            : selectedMeshCell.score >
                                selectedMeshNeighborAverage
                              ? "周辺より良好"
                              : selectedMeshCell.score <
                                  selectedMeshNeighborAverage
                                ? "周辺より注意"
                                : "周辺並み"}
                        </dd>
                      </div>
                    </dl>
                  </>
                ) : (
                  <p className="text-xs leading-relaxed text-zinc-600">
                    {selectedMeshCell.source === "unavailable"
                      ? "このセルのJ-SHIS表層地盤データは取得できませんでした。"
                      : "このセルはまだ未取得です。表示中の地盤情報を取得ボタンでJ-SHISデータを取得できます。"}
                  </p>
                )}
                <p className="mt-2 text-[10px] leading-tight text-zinc-400">
                  {selectedMeshCell.source === "j-shis"
                    ? `J-SHIS 表層地盤データ ${
                        selectedMeshCell.meshcode
                          ? `（${selectedMeshCell.meshcode}）`
                          : ""
                      }`
                    : selectedMeshCell.source === "unavailable"
                      ? `J-SHIS 取得失敗: ${
                          selectedMeshCell.errorMessage ??
                          "表層地盤情報を取得できませんでした。"
                        }`
                      : "未取得セルです。地形名・評価・色分けは実データ取得後に表示します。"}
                </p>
              </div>
            </Popup>
          )}
        </Map>

        <div className="absolute right-2 top-2 z-10 hidden sm:right-3 sm:top-3 lg:block">
          <BaseMapControl baseMap={baseMap} onChange={setBaseMap} />
        </div>

        <div className="absolute left-2 right-2 top-2 z-10 flex flex-col items-end gap-1.5 sm:left-3 sm:right-auto sm:top-3 sm:items-start sm:gap-2 lg:max-w-[22rem]">
          <AddressSearchControl
            onSelect={selectSearchPlace}
            getProximity={getSearchProximity}
          />

          <button
            type="button"
            className={`flex size-10 shrink-0 items-center justify-center rounded-full border shadow-sm backdrop-blur transition-colors lg:hidden ${
              toolsOpen
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 bg-white/95 text-zinc-800 hover:bg-zinc-50"
            }`}
            aria-expanded={toolsOpen}
            aria-label={toolsOpen ? "表示モードを閉じる" : "表示モードを開く"}
            onClick={() => setToolsOpen((open) => !open)}
          >
            <SlidersIcon className="size-5" />
          </button>

          <div
            className={`min-w-0 w-[min(calc(100vw-1rem),17.5rem)] overflow-y-auto overscroll-contain sm:w-[min(calc(100vw-1.5rem),17.5rem)] ${
              toolsOpen ? "max-h-[min(75vh,28rem)]" : "hidden"
            } lg:block lg:max-h-[calc(100vh-5rem)] lg:w-[17.5rem]`}
          >
            <MapToolsPanel
              iseModeEnabled={iseModeEnabled}
              baseMap={baseMap}
              onChangeBaseMap={setBaseMap}
              activeHazards={activeHazards}
              onToggleHazard={toggleHazard}
              surfaceSoilMeshVisible={surfaceSoilMeshVisible}
              surfaceSoilMeshLoading={surfaceSoilMeshLoading}
              surfaceSoilMeshLoadedCount={surfaceSoilMeshLoadedCount}
              surfaceSoilMeshFailedCount={surfaceSoilMeshFailedCount}
              surfaceSoilMeshTargetCount={surfaceSoilMesh.features.length}
              surfaceSoilMeshFetchableCount={
                surfaceSoilMeshFetchCandidates.length
              }
              surfaceSoilMeshFetchTotal={surfaceSoilMeshFetchTotal}
              surfaceSoilMeshFetchedCount={surfaceSoilMeshFetchedCount}
              surfaceSoilMeshCanFetch={canFetchSurfaceSoilMesh}
              surfaceSoilMeshMinZoom={SURFACE_SOIL_MESH_MIN_ZOOM}
              currentZoom={currentZoom}
              onToggleSurfaceSoilMesh={() =>
                setSurfaceSoilMeshVisible((v) => !v)
              }
              onFetchSurfaceSoilMesh={fetchVisibleSurfaceSoilMesh}
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
          className={`absolute left-2 z-10 max-w-[calc(100%-6rem)] rounded-xl bg-white/90 px-2 py-1.5 shadow-sm backdrop-blur sm:left-3 sm:px-2.5 sm:py-2 ${
            detailOpen && !isDesktop
              ? "bottom-[calc(min(58vh,28rem)+0.5rem)]"
              : "bottom-12 sm:bottom-3"
          } lg:bottom-3`}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-pressed={iseModeEnabled}
              aria-label={
                iseModeEnabled ? "伊勢モードを無効にする" : "伊勢モードを有効にする"
              }
              onClick={() => {
                setIseModeEnabled((enabled) => {
                  if (enabled) {
                    setSelectedTransaction(null);
                    setHighlightShujuuDistrict(false);
                    setHighlightShuudouDistrict(false);
                    setHighlightIsuzuDistrict(false);
                  }
                  return !enabled;
                });
              }}
              className={`rounded-lg outline-none transition ${
                iseModeEnabled
                  ? "ring-2 ring-emerald-500 ring-offset-2"
                  : "hover:ring-2 hover:ring-zinc-300 hover:ring-offset-2 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
              }`}
            >
              <Image
                src="/apple-icon.png"
                alt=""
                width={36}
                height={36}
                className="size-9 rounded-lg"
                priority
              />
            </button>
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

      <MarketTransactionDetailPanel
        transaction={iseModeEnabled ? selectedTransaction : null}
        locationTransactions={
          iseModeEnabled ? selectedLocationGroup?.transactions ?? [] : []
        }
        onSelectTransaction={setSelectedTransaction}
        onClose={closeDetail}
      />
    </div>
  );
}

function SlidersIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M4 7h5m4 0h7M4 17h7m4 0h5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M11 7a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM9 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}
