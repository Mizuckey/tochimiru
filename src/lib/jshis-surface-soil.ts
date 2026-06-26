import type {
  JshisSurfaceSoilErrorCode,
  JshisSurfaceSoilGeoJsonResponse,
  JshisSurfaceSoilVersion,
  SurfaceSoilEvaluation,
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

function clampEvaluationScore(score: number): SurfaceSoilEvaluation["score"] {
  return Math.min(5, Math.max(1, Math.round(score))) as SurfaceSoilEvaluation["score"];
}

function geomorphologyAdjustment(geomorphologyName: string | null): number {
  if (!geomorphologyName) return 0;

  const name = geomorphologyName.replace(/\s/g, "");

  if (/(埋立|干拓|旧河道)/.test(name)) return -2;
  if (/(後背湿地|三角州|海岸低地|谷底|氾濫|湿地)/.test(name)) return -1;
  if (/(山地|丘陵|台地|段丘|ローム)/.test(name)) return 1;

  return 0;
}

export function evaluateSurfaceSoil({
  avs30,
  amplificationFactor,
  geomorphologyName,
}: {
  avs30: number | null;
  amplificationFactor: number | null;
  geomorphologyName: string | null;
}): SurfaceSoilEvaluation {
  /*
   * 地盤評価は J-SHIS の公式ランクではなく、一般ユーザー向けのアプリ内目安。
   *
   * 根拠:
   * - AVS30 は表層30mの平均S波速度で、値が大きいほど硬く揺れにくい地盤の目安になる。
   * - ARV は工学的基盤から地表までの最大速度増幅率で、値が小さいほど揺れが増幅しにくい。
   * - 微地形区分は地形の成り立ちを表すため、山地・丘陵・台地系は加点、
   *   低地・湿地・旧河道・埋立/干拓地系は減点する。
   * - 数値だけで断定すると誤解を招くため、AVS30/ARVを主軸にしつつ微地形は補正値として扱う。
   */
  let score = 3;

  if (avs30 != null) {
    if (avs30 >= 400) score += 2;
    else if (avs30 >= 300) score += 1;
    else if (avs30 < 150) score -= 2;
    else if (avs30 < 200) score -= 1;
  }

  if (amplificationFactor != null) {
    if (amplificationFactor <= 1.3) score += 2;
    else if (amplificationFactor <= 1.5) score += 1;
    else if (amplificationFactor > 2.1) score -= 2;
    else if (amplificationFactor > 1.8) score -= 1;
  }

  score += geomorphologyAdjustment(geomorphologyName);

  const normalizedScore = clampEvaluationScore(score / 2 + 1.5);

  const labels: Record<SurfaceSoilEvaluation["score"], SurfaceSoilEvaluation["label"]> = {
    5: "非常に良い",
    4: "良い",
    3: "普通",
    2: "注意",
    1: "要注意",
  };

  const summaries: Record<SurfaceSoilEvaluation["score"], string> = {
    5: "揺れが増幅しにくい地盤と考えられる目安です。",
    4: "比較的しっかりした地盤と考えられる目安です。",
    3: "標準的な地盤と考えられる目安です。",
    2: "揺れやすさに少し注意したい地盤の目安です。",
    1: "揺れやすさや地形条件に注意したい地盤の目安です。",
  };

  return {
    score: normalizedScore,
    stars: `${"★".repeat(normalizedScore)}${"☆".repeat(5 - normalizedScore)}`,
    label: labels[normalizedScore],
    summary: summaries[normalizedScore],
  };
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

  const avs30 = toNullableNumber(properties.AVS);
  const amplificationFactor = toNullableNumber(properties.ARV);
  const geomorphologyName = properties.JNAME ?? null;

  return {
    meshcode,
    version: response.metaData?.version ?? DEFAULT_VERSION,
    geomorphologyCode: properties.JCODE ?? null,
    geomorphologyName,
    avs30,
    amplificationFactor,
    evaluation: evaluateSurfaceSoil({
      avs30,
      amplificationFactor,
      geomorphologyName,
    }),
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
