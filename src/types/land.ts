export type TsunamiRisk = "low" | "medium" | "high";

export type SchoolDistrict = {
  /** 小学校区 */
  elementary?: string;
  /** 中学校区 */
  juniorHigh?: string;
};

export type LandListing = {
  id: string;
  name: string;
  /** 物件所在地（取得元サイトの住所表記） */
  address?: string;
  lat: number;
  lng: number;
  /** 価格（万円） */
  price: number;
  /** 土地面積（㎡） */
  areaSqm?: number;
  memo: string;
  /** 標高（m）。Phase 1 は手入力（将来は国土地理院標高APIで取得予定） */
  elevation?: number;
  /** 学区 */
  schoolDistrict?: SchoolDistrict;
  /** 津波リスク（手入力の暫定評価） */
  tsunamiRisk?: TsunamiRisk;
  /** 取得元サイト名 */
  sourceSite?: string;
  /** 取得元URL */
  sourceUrl?: string;
  /** 取得元サイト上の代表画像URL（画像自体は保存しない） */
  imageUrl?: string;
  /** 取得元サイト内のID */
  externalId?: string;
};

export type HazardLayerId =
  | "flood"
  | "floodKeizoku"
  | "kaokuHanran"
  | "tsunami"
  | "hightide"
  | "debrisFlow"
  | "steepSlope"
  | "landslide";

export type HazardCategory = "浸水・洪水" | "津波・高潮" | "土砂災害";

/** 鉄道駅（最寄り駅・徒歩距離の算出に使う参照データ） */
export type Station = {
  name: string;
  lat: number;
  lng: number;
  /** 路線名（例: 近鉄山田線 / JR参宮線） */
  line: string;
};

/** 避難所（最寄り避難所までの距離算出に使う参照データ） */
export type Shelter = {
  name: string;
  lat: number;
  lng: number;
};

/** 地図のピンを色分けする指標 */
export type ColorMode = "price" | "station" | "elevation" | "tsunami";

/** Supabase `lands` テーブルの行（snake_case） */
export type LandRow = {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  price: number;
  area_sqm: number | null;
  memo: string;
  elevation: number | null;
  school_elementary: string | null;
  school_junior_high: string | null;
  tsunami_risk: TsunamiRisk | null;
  source_site: string | null;
  source_url: string | null;
  image_url: string | null;
  external_id: string | null;
};
