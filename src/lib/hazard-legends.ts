export type LegendItem = { color: string; label: string };

export type HazardLegendId = "depth" | "duration" | "kaoku" | "sediment";

/**
 * 国土地理院ハザードマップの区分に準拠した凡例。
 * 色は標準的な浸水深ランク等に基づく代表値。
 * @see https://disaportal.gsi.go.jp/hazardmap/copyright/opendata.html
 */
export const HAZARD_LEGENDS: Record<
  HazardLegendId,
  { title: string; items: LegendItem[]; note?: string }
> = {
  depth: {
    title: "浸水深",
    items: [
      { color: "#F7F5A9", label: "〜0.5m" },
      { color: "#FFD8C0", label: "0.5〜3m" },
      { color: "#FFB7B7", label: "3〜5m" },
      { color: "#FF9191", label: "5〜10m" },
      { color: "#F285C9", label: "10〜20m" },
      { color: "#DC7ADC", label: "20m〜" },
    ],
  },
  duration: {
    title: "浸水継続時間",
    items: [
      { color: "#F7F5A9", label: "〜12時間" },
      { color: "#FFD8C0", label: "12時間〜1日" },
      { color: "#FFB7B7", label: "1〜3日" },
      { color: "#FF9191", label: "3日〜1週間" },
      { color: "#F285C9", label: "1〜2週間" },
      { color: "#DC7ADC", label: "2週間〜" },
    ],
  },
  kaoku: {
    title: "家屋倒壊等氾濫想定区域",
    items: [{ color: "#FF6699", label: "氾濫流による区域" }],
  },
  sediment: {
    title: "土砂災害警戒区域",
    items: [
      { color: "#FFED4D", label: "警戒区域（イエロー）" },
      { color: "#FF4D4D", label: "特別警戒区域（レッド）" },
    ],
  },
};
