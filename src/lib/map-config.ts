import type { HazardLayerId } from "@/types/land";

export const DEFAULT_ZOOM = 12;

export const MAP_STYLE = "mapbox://styles/mapbox/outdoors-v12";

/**
 * 国土地理院 重ねるハザードマップ（伊勢市: 三重県24 / 24203）
 * @see https://disaportal.gsi.go.jp/hazardmap/
 */
export const HAZARD_LAYERS: Record<
  HazardLayerId,
  { label: string; tiles: string[] }
> = {
  flood: {
    label: "洪水浸水想定",
    tiles: [
      "https://disaportal.gsi.go.jp/hazardmap/maps/024/24203/flood_l2/{z}/{x}/{y}.png",
    ],
  },
  tsunami: {
    label: "津波浸水想定",
    tiles: [
      "https://disaportal.gsi.go.jp/hazardmap/maps/024/24203/tsunami/{z}/{x}/{y}.png",
    ],
  },
};
