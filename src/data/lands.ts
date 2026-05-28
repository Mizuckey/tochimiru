import type { LandListing } from "@/types/land";

/** 伊勢市中心（内宮付近） */
export const ISE_CENTER = {
  lat: 34.487,
  lng: 136.708,
} as const;

/** Phase 0: 手入力の土地データ（伊勢市エリア5件） */
export const lands: LandListing[] = [
  {
    id: "ise-1",
    name: "伊勢市宇治山田町",
    lat: 34.4881,
    lng: 136.7074,
    price: 1200,
    memo: "駅近。坂道あり。周辺にスーパー多数",
  },
  {
    id: "ise-2",
    name: "伊勢市神宮前",
    lat: 34.4589,
    lng: 136.7308,
    price: 1850,
    memo: "内宮エリア。観光地の静けさ。価格はやや高め",
  },
  {
    id: "ise-3",
    name: "伊勢市二見町",
    lat: 34.5082,
    lng: 136.7891,
    price: 980,
    memo: "海近い。二見浦寄り。潮風・塩害は要確認",
  },
  {
    id: "ise-4",
    name: "伊勢市宮川町",
    lat: 34.5123,
    lng: 136.6978,
    price: 750,
    memo: "宮川沿い。水害リスクはハザードマップで要確認",
  },
  {
    id: "ise-5",
    name: "伊勢市吹上",
    lat: 34.5012,
    lng: 136.6821,
    price: 1100,
    memo: "閑静な住宅地。車必須になりがち",
  },
];
