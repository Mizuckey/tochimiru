import type { Station } from "@/types/land";

/**
 * 伊勢市内の主要駅（近鉄・JR）。座標は概算。
 * 最寄り駅・徒歩距離の算出に使う。
 */
export const stations: Station[] = [
  { name: "伊勢市駅", lat: 34.4904, lng: 136.7045, line: "近鉄山田線 / JR参宮線" },
  { name: "宇治山田駅", lat: 34.4897, lng: 136.7106, line: "近鉄山田線" },
  { name: "五十鈴川駅", lat: 34.4727, lng: 136.7283, line: "近鉄鳥羽線" },
  { name: "山田上口駅", lat: 34.4953, lng: 136.6952, line: "JR参宮線" },
  { name: "宮川駅", lat: 34.4936, lng: 136.679, line: "JR参宮線" },
  { name: "二見浦駅", lat: 34.5071, lng: 136.7857, line: "JR参宮線" },
];
