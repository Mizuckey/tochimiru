export type JshisSurfaceSoilVersion = "V1" | "V2" | "V3" | "V4";

export type JshisSurfaceSoilErrorCode =
  | "INVALID_REQUEST"
  | "DB_CONNECT_ERROR"
  | "UNKNOWN_ERROR"
  | "NOT_FOUND";

export type JshisSurfaceSoilProperties = {
  meshcode?: string;
  JCODE?: string;
  JNAME?: string;
  AVS?: string;
  ARV?: string;
  AVS_EB?: string;
  AVS_REF?: string;
};

export type JshisSurfaceSoilGeoJsonResponse = {
  type: "FeatureCollection";
  status: "Success" | "Error";
  features?: {
    type?: "Feature";
    geometry?: unknown;
    properties?: JshisSurfaceSoilProperties;
  }[];
  metaData?: {
    meshcode?: string;
    version?: JshisSurfaceSoilVersion;
    attr?: { name: string; unit: string }[];
  };
  error?: {
    code: JshisSurfaceSoilErrorCode;
    message: string;
  };
};

export type SurfaceSoilDto = {
  meshcode: string;
  version: JshisSurfaceSoilVersion;
  geomorphologyCode: string | null;
  geomorphologyName: string | null;
  avs30: number | null;
  amplificationFactor: number | null;
  evaluation: SurfaceSoilEvaluation;
  source: "j-shis";
  fetchedAt: string;
};

export type SurfaceSoilEvaluation = {
  score: 1 | 2 | 3 | 4 | 5;
  stars: string;
  label: "非常に良い" | "良い" | "普通" | "注意" | "要注意";
  summary: string;
};

export type SurfaceSoilResult =
  | {
      ok: true;
      data: SurfaceSoilDto;
      cache: "hit" | "miss" | "unavailable";
    }
  | {
      ok: false;
      data: null;
      error: {
        message: string;
        code?: JshisSurfaceSoilErrorCode | "NETWORK_ERROR" | "INVALID_RESPONSE";
      };
      cache: "hit" | "miss" | "unavailable";
    };
