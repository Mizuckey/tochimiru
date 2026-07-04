import type { Feature, FeatureCollection, Polygon } from "geojson";

import type {
  SurfaceSoilDto,
  SurfaceSoilEvaluation,
} from "@/types/jshis-surface-soil";

export type SurfaceSoilMeshCellProperties = {
  id: string;
  score: SurfaceSoilEvaluation["score"] | null;
  label: SurfaceSoilEvaluation["label"] | null;
  summary: string | null;
  geomorphologyName: string | null;
  avs30: number | null;
  amplificationFactor: number | null;
  centerLat: number;
  centerLng: number;
  row: number;
  col: number;
  west: number;
  south: number;
  east: number;
  north: number;
  source: "pending" | "j-shis" | "unavailable";
  meshcode?: string;
  fetchedAt?: string;
  errorMessage?: string;
};

export type SurfaceSoilMeshCell = Feature<
  Polygon,
  SurfaceSoilMeshCellProperties
>;

export type SurfaceSoilMeshFeatureCollection = FeatureCollection<
  Polygon,
  SurfaceSoilMeshCellProperties
>;

const MESH_SIZE_METERS = 250;
const WEB_MERCATOR_RADIUS_METERS = 6_378_137;
const WEB_MERCATOR_MAX_LAT = 85.05112878;

export type SurfaceSoilMeshBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export function emptySurfaceSoilMesh(): SurfaceSoilMeshFeatureCollection {
  return {
    type: "FeatureCollection",
    features: [],
  };
}

function clampLat(lat: number) {
  return Math.min(WEB_MERCATOR_MAX_LAT, Math.max(-WEB_MERCATOR_MAX_LAT, lat));
}

function lngToWebMercatorX(lng: number) {
  return WEB_MERCATOR_RADIUS_METERS * (lng * Math.PI) / 180;
}

function latToWebMercatorY(lat: number) {
  const clampedLat = clampLat(lat);
  return (
    WEB_MERCATOR_RADIUS_METERS *
    Math.log(Math.tan(Math.PI / 4 + (clampedLat * Math.PI) / 360))
  );
}

function webMercatorXToLng(x: number) {
  return (x / WEB_MERCATOR_RADIUS_METERS) * (180 / Math.PI);
}

function webMercatorYToLat(y: number) {
  return (
    (Math.atan(Math.exp(y / WEB_MERCATOR_RADIUS_METERS)) - Math.PI / 4) *
    (360 / Math.PI)
  );
}

export function surfaceSoilMeshColor(score: SurfaceSoilEvaluation["score"]) {
  const colors: Record<SurfaceSoilEvaluation["score"], string> = {
    5: "#1d9a8a",
    4: "#72b95f",
    3: "#e0c84f",
    2: "#ee8a3b",
    1: "#d84b4b",
  };
  return colors[score];
}

export function createSurfaceSoilMeshForBounds({
  west,
  south,
  east,
  north,
}: SurfaceSoilMeshBounds): SurfaceSoilMeshFeatureCollection {
  const minX = lngToWebMercatorX(Math.min(west, east));
  const maxX = lngToWebMercatorX(Math.max(west, east));
  const minY = latToWebMercatorY(Math.min(south, north));
  const maxY = latToWebMercatorY(Math.max(south, north));
  const minCol = Math.floor(minX / MESH_SIZE_METERS);
  const maxCol = Math.floor(maxX / MESH_SIZE_METERS);
  const minRow = Math.floor(minY / MESH_SIZE_METERS);
  const maxRow = Math.floor(maxY / MESH_SIZE_METERS);
  const features: SurfaceSoilMeshCell[] = [];

  for (let row = minRow; row <= maxRow; row += 1) {
    for (let col = minCol; col <= maxCol; col += 1) {
      const cellWest = webMercatorXToLng(col * MESH_SIZE_METERS);
      const cellEast = webMercatorXToLng((col + 1) * MESH_SIZE_METERS);
      const cellSouth = webMercatorYToLat(row * MESH_SIZE_METERS);
      const cellNorth = webMercatorYToLat((row + 1) * MESH_SIZE_METERS);
      const centerLng = (cellWest + cellEast) / 2;
      const centerLat = (cellSouth + cellNorth) / 2;

      features.push({
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [cellWest, cellSouth],
              [cellEast, cellSouth],
              [cellEast, cellNorth],
              [cellWest, cellNorth],
              [cellWest, cellSouth],
            ],
          ],
        },
        properties: {
          id: `wm-250m-${col}-${row}`,
          score: null,
          label: null,
          summary: null,
          geomorphologyName: null,
          avs30: null,
          amplificationFactor: null,
          centerLat,
          centerLng,
          row,
          col,
          west: cellWest,
          south: cellSouth,
          east: cellEast,
          north: cellNorth,
          source: "pending",
        },
      });
    }
  }

  return {
    type: "FeatureCollection",
    features,
  };
}

export function applySurfaceSoilToMeshCell(
  cell: SurfaceSoilMeshCell,
  data: SurfaceSoilDto,
): SurfaceSoilMeshCell {
  return {
    ...cell,
    properties: {
      ...cell.properties,
      score: data.evaluation.score,
      label: data.evaluation.label,
      summary: data.evaluation.summary,
      geomorphologyName: data.geomorphologyName ?? "地形区分なし",
      avs30: data.avs30,
      amplificationFactor: data.amplificationFactor,
      source: "j-shis",
      meshcode: data.meshcode,
      fetchedAt: data.fetchedAt,
      errorMessage: undefined,
    },
  };
}

export function markSurfaceSoilMeshCellUnavailable(
  cell: SurfaceSoilMeshCell,
  errorMessage: string,
): SurfaceSoilMeshCell {
  return {
    ...cell,
    properties: {
      ...cell.properties,
      source: "unavailable",
      errorMessage,
    },
  };
}

export function getNeighborMeshCells(
  mesh: SurfaceSoilMeshFeatureCollection,
  selected: SurfaceSoilMeshCellProperties,
) {
  return mesh.features.filter((feature) => {
    const rowDelta = Math.abs(feature.properties.row - selected.row);
    const colDelta = Math.abs(feature.properties.col - selected.col);
    return rowDelta <= 1 && colDelta <= 1;
  });
}
