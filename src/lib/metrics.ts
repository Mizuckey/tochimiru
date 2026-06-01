import { stations } from "@/data/stations";
import { shelters } from "@/data/shelters";
import type { LandListing, Shelter, Station } from "@/types/land";

/** 不動産表示の徒歩所要時間基準（道路距離80mを1分換算） */
const WALK_SPEED_M_PER_MIN = 80;

type LatLng = { lat: number; lng: number };

/** 2地点間の直線距離（メートル） */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** 直線距離からの推定徒歩分（実際の道路距離ではない暫定値） */
export function estimateWalkMinutes(distanceM: number): number {
  return Math.max(1, Math.ceil(distanceM / WALK_SPEED_M_PER_MIN));
}

export type NearestStation = {
  station: Station;
  distanceM: number;
  walkMin: number;
};

export type NearestShelter = {
  shelter: Shelter;
  distanceM: number;
};

export type LandMetrics = {
  nearestStation: NearestStation | null;
  nearestShelter: NearestShelter | null;
};

function nearest<T extends LatLng>(land: LatLng, points: T[]): T | null {
  let best: T | null = null;
  let bestDist = Infinity;
  for (const point of points) {
    const d = haversineMeters(land, point);
    if (d < bestDist) {
      bestDist = d;
      best = point;
    }
  }
  return best;
}

export function computeLandMetrics(land: LandListing): LandMetrics {
  const station = nearest(land, stations);
  const shelter = nearest(land, shelters);

  const nearestStation: NearestStation | null = station
    ? (() => {
        const distanceM = haversineMeters(land, station);
        return {
          station,
          distanceM,
          walkMin: estimateWalkMinutes(distanceM),
        };
      })()
    : null;

  const nearestShelter: NearestShelter | null = shelter
    ? { shelter, distanceM: haversineMeters(land, shelter) }
    : null;

  return { nearestStation, nearestShelter };
}

/** 距離（m）を読みやすい文字列に整形 */
export function formatDistance(distanceM: number): string {
  if (distanceM < 1000) {
    return `${Math.round(distanceM)} m`;
  }
  return `${(distanceM / 1000).toFixed(1)} km`;
}
