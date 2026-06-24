import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import type { LandListing, LandRow } from "@/types/land";

type LandWriteRequest = {
  id?: unknown;
  name?: unknown;
  address?: unknown;
  lat?: unknown;
  lng?: unknown;
  price?: unknown;
  areaSqm?: unknown;
  elevation?: unknown;
  sourceUrl?: unknown;
};

function rowToLand(row: LandRow): LandListing {
  return {
    id: row.id,
    name: row.name,
    address: row.address ?? undefined,
    lat: row.lat,
    lng: row.lng,
    price: row.price,
    areaSqm: row.area_sqm ?? undefined,
    memo: row.memo,
    elevation: row.elevation ?? undefined,
    schoolDistrict:
      row.school_elementary || row.school_junior_high
        ? {
            elementary: row.school_elementary ?? undefined,
            juniorHigh: row.school_junior_high ?? undefined,
          }
        : undefined,
    tsunamiRisk: row.tsunami_risk ?? undefined,
    sourceSite: row.source_site ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    imageUrl: row.image_url ?? undefined,
    externalId: row.external_id ?? undefined,
    latLngOverridden: row.lat_lng_overridden ?? undefined,
  };
}

function optionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function numberValue(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function integerValue(value: unknown): number | null {
  const parsed = numberValue(value);
  if (parsed == null || !Number.isInteger(parsed)) return null;
  return parsed;
}

function getSupabaseWriteConfig():
  | { supabaseUrl: string; serviceRoleKey: string }
  | NextResponse {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Supabase write environment variables are not configured." },
      { status: 500 },
    );
  }

  return { supabaseUrl, serviceRoleKey };
}

async function readJsonBody(request: NextRequest): Promise<LandWriteRequest> {
  return (await request.json()) as LandWriteRequest;
}

export async function POST(request: NextRequest) {
  const config = getSupabaseWriteConfig();
  if (config instanceof NextResponse) return config;

  let body: LandWriteRequest;
  try {
    body = await readJsonBody(request);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = optionalText(body.name);
  const lat = numberValue(body.lat);
  const lng = numberValue(body.lng);
  const price = integerValue(body.price);
  const areaSqm = numberValue(body.areaSqm);
  const elevation = numberValue(body.elevation);

  if (!name || lat == null || lng == null || price == null) {
    return NextResponse.json(
      { error: "name, lat, lng, and integer price are required." },
      { status: 400 },
    );
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180 || price < 0) {
    return NextResponse.json(
      { error: "lat, lng, or price is out of range." },
      { status: 400 },
    );
  }

  const supabase = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("lands")
    .insert({
      id: `manual-${crypto.randomUUID()}`,
      name,
      address: optionalText(body.address) ?? name,
      lat,
      lng,
      price,
      area_sqm: areaSqm,
      memo: "",
      elevation,
      tsunami_risk: null,
      source_site: "manual",
      source_url: optionalText(body.sourceUrl),
      lat_lng_overridden: true,
      fetched_at: new Date().toISOString(),
    })
    .select(
      "id, name, address, lat, lng, price, area_sqm, memo, elevation, school_elementary, school_junior_high, tsunami_risk, source_site, source_url, image_url, external_id, lat_lng_overridden",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ land: rowToLand(data as LandRow) });
}

export async function PATCH(request: NextRequest) {
  const config = getSupabaseWriteConfig();
  if (config instanceof NextResponse) return config;

  let body: LandWriteRequest;
  try {
    body = await readJsonBody(request);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const id = optionalText(body.id);
  const lat = numberValue(body.lat);
  const lng = numberValue(body.lng);
  if (id && lat != null && lng != null && body.name == null && body.price == null) {
    return updateLandLocation(config, id, lat, lng);
  }

  const name = optionalText(body.name);
  const price = integerValue(body.price);
  const areaSqm = numberValue(body.areaSqm);
  const elevation = numberValue(body.elevation);

  if (!id || !name || price == null) {
    return NextResponse.json(
      { error: "id, name, and integer price are required." },
      { status: 400 },
    );
  }

  if (!id.startsWith("manual-") || price < 0) {
    return NextResponse.json(
      { error: "id or price is out of range." },
      { status: 400 },
    );
  }

  const supabase = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("lands")
    .update({
      name,
      address: optionalText(body.address) ?? name,
      price,
      area_sqm: areaSqm,
      elevation,
      source_url: optionalText(body.sourceUrl),
    })
    .eq("id", id)
    .eq("source_site", "manual")
    .select(
      "id, name, address, lat, lng, price, area_sqm, memo, elevation, school_elementary, school_junior_high, tsunami_risk, source_site, source_url, image_url, external_id, lat_lng_overridden",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ land: rowToLand(data as LandRow) });
}

async function updateLandLocation(
  config: { supabaseUrl: string; serviceRoleKey: string },
  id: string,
  lat: number,
  lng: number,
) {
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json(
      { error: "lat or lng is out of range." },
      { status: 400 },
    );
  }

  const supabase = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("lands")
    .update({
      lat,
      lng,
      lat_lng_overridden: true,
    })
    .eq("id", id)
    .select(
      "id, name, address, lat, lng, price, area_sqm, memo, elevation, school_elementary, school_junior_high, tsunami_risk, source_site, source_url, image_url, external_id, lat_lng_overridden",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ land: rowToLand(data as LandRow) });
}
