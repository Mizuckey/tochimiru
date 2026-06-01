import type { HazardCategory, HazardLayerId } from "@/types/land";
import type { HazardLegendId } from "@/lib/hazard-legends";

export const DEFAULT_ZOOM = 12;

export type BaseMapId = "standard" | "satellite";

export const BASE_MAPS: Record<
  BaseMapId,
  { label: string; style: string }
> = {
  standard: {
    label: "地図",
    style: "mapbox://styles/mapbox/outdoors-v12",
  },
  satellite: {
    label: "航空写真",
    style: "mapbox://styles/mapbox/satellite-streets-v12",
  },
};

export const DEFAULT_BASE_MAP: BaseMapId = "standard";

/** @deprecated BASE_MAPS を使用 */
export const MAP_STYLE = BASE_MAPS.standard.style;

/**
 * 国土地理院 重ねるハザードマップ（全国版タイル）
 * @see https://disaportal.gsi.go.jp/hazardmap/copyright/opendata.html
 */
export const HAZARD_ATTRIBUTION =
  '<a href="https://disaportal.gsi.go.jp/" target="_blank" rel="noreferrer">国土地理院 ハザードマップポータル</a>';

type HazardLayerConfig = {
  label: string;
  category: HazardCategory;
  legend: HazardLegendId;
  tiles: string[];
  opacity: number;
  minzoom?: number;
  maxzoom?: number;
};

const GSI_RASTER = "https://disaportaldata.gsi.go.jp/raster";
const ZOOM = { minzoom: 2, maxzoom: 17 } as const;

export const HAZARD_LAYERS: Record<HazardLayerId, HazardLayerConfig> = {
  flood: {
    label: "洪水浸水想定（想定最大規模）",
    category: "浸水・洪水",
    legend: "depth",
    tiles: [`${GSI_RASTER}/01_flood_l2_shinsuishin_data/{z}/{x}/{y}.png`],
    opacity: 0.55,
    ...ZOOM,
  },
  floodKeizoku: {
    label: "浸水継続時間（洪水）",
    category: "浸水・洪水",
    legend: "duration",
    tiles: [`${GSI_RASTER}/01_flood_l2_keizoku_data/{z}/{x}/{y}.png`],
    opacity: 0.55,
    ...ZOOM,
  },
  kaokuHanran: {
    label: "家屋倒壊等氾濫想定区域（氾濫流）",
    category: "浸水・洪水",
    legend: "kaoku",
    tiles: [`${GSI_RASTER}/01_flood_l2_kaokutoukai_hanran_data/{z}/{x}/{y}.png`],
    opacity: 0.5,
    ...ZOOM,
  },
  tsunami: {
    label: "津波浸水想定",
    category: "津波・高潮",
    legend: "depth",
    tiles: [`${GSI_RASTER}/04_tsunami_newlegend_data/{z}/{x}/{y}.png`],
    opacity: 0.45,
    ...ZOOM,
  },
  hightide: {
    label: "高潮浸水想定（想定最大規模）",
    category: "津波・高潮",
    legend: "depth",
    tiles: [`${GSI_RASTER}/03_hightide_l2_shinsuishin_data/{z}/{x}/{y}.png`],
    opacity: 0.5,
    ...ZOOM,
  },
  debrisFlow: {
    label: "土石流警戒区域",
    category: "土砂災害",
    legend: "sediment",
    tiles: [`${GSI_RASTER}/05_dosekiryukeikaikuiki/{z}/{x}/{y}.png`],
    opacity: 0.7,
    ...ZOOM,
  },
  steepSlope: {
    label: "急傾斜地の崩壊警戒区域",
    category: "土砂災害",
    legend: "sediment",
    tiles: [`${GSI_RASTER}/05_kyukeishakeikaikuiki/{z}/{x}/{y}.png`],
    opacity: 0.7,
    ...ZOOM,
  },
  landslide: {
    label: "地すべり警戒区域",
    category: "土砂災害",
    legend: "sediment",
    tiles: [`${GSI_RASTER}/05_jisuberikeikaikuiki/{z}/{x}/{y}.png`],
    opacity: 0.7,
    ...ZOOM,
  },
};

export const HAZARD_CATEGORY_ORDER: HazardCategory[] = [
  "浸水・洪水",
  "津波・高潮",
  "土砂災害",
];
