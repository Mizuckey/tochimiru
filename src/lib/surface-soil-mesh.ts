import type { Feature, FeatureCollection, Polygon } from "geojson";

import type {
  SurfaceSoilDto,
  SurfaceSoilEvaluation,
} from "@/types/jshis-surface-soil";

export type SurfaceSoilMeshCellProperties = {
  id: string;
  score: SurfaceSoilEvaluation["score"];
  label: SurfaceSoilEvaluation["label"];
  summary: string;
  geomorphologyName: string;
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
  source: "prototype" | "j-shis" | "unavailable";
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

const SCORE_LABELS: Record<
  SurfaceSoilEvaluation["score"],
  SurfaceSoilEvaluation["label"]
> = {
  5: "非常に良い",
  4: "良い",
  3: "普通",
  2: "注意",
  1: "要注意",
};

const SCORE_SUMMARIES: Record<SurfaceSoilEvaluation["score"], string> = {
  5: "揺れが増幅しにくい地盤と考えられる目安です。",
  4: "比較的しっかりした地盤と考えられる目安です。",
  3: "標準的な地盤と考えられる目安です。",
  2: "揺れやすさに少し注意したい地盤の目安です。",
  1: "揺れやすさや地形条件に注意したい地盤の目安です。",
};

const GEOMORPHOLOGY_NAMES: Record<SurfaceSoilEvaluation["score"], string[]> = {
  5: ["山地", "丘陵地", "砂礫質台地"],
  4: ["段丘", "ローム台地", "扇状地"],
  3: ["自然堤防", "砂州", "谷底平野"],
  2: ["後背湿地", "三角州性低地", "海岸低地"],
  1: ["旧河道", "埋立地", "干拓地"],
};

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

function clampScore(score: number): SurfaceSoilEvaluation["score"] {
  return Math.min(5, Math.max(1, score)) as SurfaceSoilEvaluation["score"];
}

function prototypeScore(row: number, col: number) {
  const distancePenalty = Math.max(Math.abs(row), Math.abs(col)) > 3 ? -1 : 0;
  const terrainWave = Math.sin((row + 2) * 0.9) + Math.cos((col - 1) * 0.7);
  return clampScore(Math.round(3 + terrainWave / 1.25 + distancePenalty));
}

function createPrototypeProperties(row: number, col: number) {
  const score = prototypeScore(row, col);
  const geomorphologyOptions = GEOMORPHOLOGY_NAMES[score];
  const geomorphologyName =
    geomorphologyOptions[
      Math.abs(row * 3 + col * 5) % geomorphologyOptions.length
    ];

  return {
    score,
    label: SCORE_LABELS[score],
    summary: SCORE_SUMMARIES[score],
    geomorphologyName,
    avs30: Math.round(130 + score * 62 + ((row - col) % 4) * 9),
    amplificationFactor: Number((2.35 - score * 0.2).toFixed(2)),
  };
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
      const prototypeProperties = createPrototypeProperties(row, col);

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
          ...prototypeProperties,
          centerLat,
          centerLng,
          row,
          col,
          west: cellWest,
          south: cellSouth,
          east: cellEast,
          north: cellNorth,
          source: "prototype",
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
