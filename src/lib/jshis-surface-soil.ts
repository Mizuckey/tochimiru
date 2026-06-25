import type {
  JshisSurfaceSoilErrorCode,
  JshisSurfaceSoilGeoJsonResponse,
  JshisSurfaceSoilVersion,
  SurfaceSoilDto,
} from "@/types/jshis-surface-soil";

const JSHIS_SURFACE_SOIL_ENDPOINT =
  "https://www.j-shis.bosai.go.jp/map/api/sstrct";

const DEFAULT_VERSION: JshisSurfaceSoilVersion = "V4";

export class JshisSurfaceSoilError extends Error {
  constructor(
    message: string,
    readonly code?: JshisSurfaceSoilErrorCode | "NETWORK_ERROR" | "INVALID_RESPONSE",
  ) {
    super(message);
    this.name = "JshisSurfaceSoilError";
  }
}

function assertPosition(lat: number, lng: number) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new JshisSurfaceSoilError("緯度経度が不正です。", "INVALID_REQUEST");
  }

  if (lng < 122 || lng > 154 || lat < 20 || lat > 47) {
    throw new JshisSurfaceSoilError(
      "J-SHIS 表層地盤 API の対応範囲外です。",
      "INVALID_REQUEST",
    );
  }
}

function toNullableNumber(value: string | undefined): number | null {
  if (!value || value === "-") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildJshisSurfaceSoilUrl({
  lat,
  lng,
  version = DEFAULT_VERSION,
}: {
  lat: number;
  lng: number;
  version?: JshisSurfaceSoilVersion;
}): string {
  assertPosition(lat, lng);

  const url = new URL(
    `${JSHIS_SURFACE_SOIL_ENDPOINT}/${version}/meshinfo.geojson`,
  );
  url.searchParams.set("position", `${lng},${lat}`);
  url.searchParams.set("epsg", "4326");
  url.searchParams.set("lang", "ja");
  return url.toString();
}

export function toSurfaceSoilDto(
  response: JshisSurfaceSoilGeoJsonResponse,
): SurfaceSoilDto {
  if (response.status === "Error") {
    throw new JshisSurfaceSoilError(
      response.error?.message ?? "J-SHIS 表層地盤 API でエラーが発生しました。",
      response.error?.code,
    );
  }

  const feature = response.features?.[0];
  const properties = feature?.properties;
  const meshcode = properties?.meshcode ?? response.metaData?.meshcode;

  if (!properties || !meshcode) {
    throw new JshisSurfaceSoilError(
      "J-SHIS 表層地盤 API のレスポンス形式が想定と異なります。",
      "INVALID_RESPONSE",
    );
  }

  return {
    meshcode,
    version: response.metaData?.version ?? DEFAULT_VERSION,
    geomorphologyCode: properties.JCODE ?? null,
    geomorphologyName: properties.JNAME ?? null,
    avs30: toNullableNumber(properties.AVS),
    amplificationFactor: toNullableNumber(properties.ARV),
    source: "j-shis",
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchJshisSurfaceSoil({
  lat,
  lng,
  version = DEFAULT_VERSION,
  signal,
}: {
  lat: number;
  lng: number;
  version?: JshisSurfaceSoilVersion;
  signal?: AbortSignal;
}): Promise<SurfaceSoilDto> {
  const url = buildJshisSurfaceSoilUrl({ lat, lng, version });

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { accept: "application/geo+json, application/json" },
      signal,
    });
  } catch (error) {
    throw new JshisSurfaceSoilError(
      error instanceof Error
        ? error.message
        : "J-SHIS 表層地盤 API への接続に失敗しました。",
      "NETWORK_ERROR",
    );
  }

  const body = (await response.json()) as JshisSurfaceSoilGeoJsonResponse;

  if (!response.ok && body.status !== "Error") {
    throw new JshisSurfaceSoilError(
      `J-SHIS 表層地盤 API が HTTP ${response.status} を返しました。`,
      response.status === 404 ? "NOT_FOUND" : "UNKNOWN_ERROR",
    );
  }

  return toSurfaceSoilDto(body);
}

export function surfaceSoilLocationKey(lat: number, lng: number): string {
  return `${lat.toFixed(6)},${lng.toFixed(6)}`;
}
