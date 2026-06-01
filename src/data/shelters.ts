import type { Shelter } from "@/types/land";

/**
 * 伊勢市内の避難所（参考）。座標は概算。
 * 最寄り避難所までの距離算出に使う。
 */
export const shelters: Shelter[] = [
  { name: "伊勢市役所", lat: 34.4884, lng: 136.7095 },
  { name: "倉田山公園", lat: 34.4836, lng: 136.7242 },
  { name: "宮川中学校", lat: 34.509, lng: 136.696 },
  { name: "二見総合支所", lat: 34.506, lng: 136.782 },
  { name: "大湊小学校", lat: 34.5, lng: 136.73 },
  { name: "吹上公園", lat: 34.5005, lng: 136.683 },
];
