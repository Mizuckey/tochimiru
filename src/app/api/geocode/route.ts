import { NextResponse } from "next/server";

import { getMapboxToken } from "@/lib/get-mapbox-token";

export const dynamic = "force-dynamic";

type MapboxGeocodeFeature = {
  id?: string;
  geometry?: {
    coordinates?: unknown;
  };
  properties?: {
    mapbox_id?: string;
    feature_type?: string;
    name?: string;
    full_address?: string;
    place_formatted?: string;
    coordinates?: {
      longitude?: number;
      latitude?: number;
      accuracy?: string;
    };
  };
};

type MapboxGeocodeResponse = {
  features?: MapboxGeocodeFeature[];
};

type GeocodeResult = {
  id: string;
  name: string;
  fullAddress: string;
  featureType: string | null;
  accuracy: string | null;
  lat: number;
  lng: number;
};

function parseCoordinatePair(feature: MapboxGeocodeFeature) {
  const longitude = feature.properties?.coordinates?.longitude;
  const latitude = feature.properties?.coordinates?.latitude;

  if (typeof longitude === "number" && typeof latitude === "number") {
    return { lng: longitude, lat: latitude };
  }

  const coordinates = feature.geometry?.coordinates;
  if (
    Array.isArray(coordinates) &&
    typeof coordinates[0] === "number" &&
    typeof coordinates[1] === "number"
  ) {
    return { lng: coordinates[0], lat: coordinates[1] };
  }

  return null;
}

function resultFromFeature(feature: MapboxGeocodeFeature): GeocodeResult | null {
  const coordinate = parseCoordinatePair(feature);
  if (!coordinate) return null;

  const id = feature.properties?.mapbox_id ?? feature.id;
  const name = feature.properties?.name ?? feature.properties?.full_address;
  const fullAddress =
    feature.properties?.full_address ??
    [feature.properties?.name, feature.properties?.place_formatted]
      .filter(Boolean)
      .join(" ");

  if (!id || !name || !fullAddress) return null;

  return {
    id,
    name,
    fullAddress,
    featureType: feature.properties?.feature_type ?? null,
    accuracy: feature.properties?.coordinates?.accuracy ?? null,
    ...coordinate,
  };
}

function validProximity(value: string | null) {
  if (!value) return null;
  const [lng, lat] = value.split(",").map((part) => Number(part.trim()));
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return null;
  return `${lng},${lat}`;
}

export async function GET(request: Request) {
  const token = getMapboxToken();
  if (!token) {
    return NextResponse.json(
      {
        ok: false,
        results: [],
        error: "Mapbox アクセストークンが設定されていません。",
      },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json(
      { ok: false, results: [], error: "検索語を入力してください。" },
      { status: 400 },
    );
  }

  if (query.includes(";")) {
    return NextResponse.json(
      { ok: false, results: [], error: "検索語にセミコロンは使えません。" },
      { status: 400 },
    );
  }

  const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
  url.searchParams.set("q", query);
  url.searchParams.set("access_token", token);
  url.searchParams.set("country", "jp");
  url.searchParams.set("language", "ja");
  url.searchParams.set("limit", "5");

  const proximity = validProximity(searchParams.get("proximity"));
  if (proximity) {
    url.searchParams.set("proximity", proximity);
  }

  const response = await fetch(url, {
    headers: { "user-agent": "tochimiru/0.1" },
  });

  if (!response.ok) {
    return NextResponse.json(
      {
        ok: false,
        results: [],
        error: "住所検索に失敗しました。",
      },
      { status: response.status },
    );
  }

  const data = (await response.json()) as MapboxGeocodeResponse;
  const results = (data.features ?? [])
    .map(resultFromFeature)
    .filter((result): result is GeocodeResult => result != null);

  return NextResponse.json({ ok: true, results });
}
