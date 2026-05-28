export type LandListing = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** 価格（万円） */
  price: number;
  memo: string;
};

export type HazardLayerId = "flood" | "tsunami";
