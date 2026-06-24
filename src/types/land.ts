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
  /** 海抜（m）。DBカラム名は既存互換のため elevation のまま */
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
  /** 座標を手動修正済みか */
  latLngOverridden?: boolean;
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
  lat_lng_overridden: boolean | null;
};
