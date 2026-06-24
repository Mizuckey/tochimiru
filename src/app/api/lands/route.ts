import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import type { LandListing, LandRow, TsunamiRisk } from "@/types/land";

type CreateLandRequest = {
  name?: unknown;
  address?: unknown;
  lat?: unknown;
  lng?: unknown;
  price?: unknown;
  areaSqm?: unknown;
  memo?: unknown;
  elevation?: unknown;
  tsunamiRisk?: unknown;
};

const TSUNAMI_RISKS = new Set<string>(["low", "medium", "high"]);

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

export async function POST(request: NextRequest) {
  const writePassword = process.env.LAND_WRITE_PASSWORD?.trim();
  const providedPassword = request.headers
    .get("x-tochimiru-write-password")
    ?.trim();

  if (!writePassword || providedPassword !== writePassword) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Supabase write environment variables are not configured." },
      { status: 500 },
    );
  }

  let body: CreateLandRequest;
  try {
    body = (await request.json()) as CreateLandRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = optionalText(body.name);
  const lat = numberValue(body.lat);
  const lng = numberValue(body.lng);
  const price = integerValue(body.price);
  const areaSqm = numberValue(body.areaSqm);
  const elevation = numberValue(body.elevation);
  const tsunamiRisk: TsunamiRisk | null =
    typeof body.tsunamiRisk === "string" && TSUNAMI_RISKS.has(body.tsunamiRisk)
      ? (body.tsunamiRisk as TsunamiRisk)
      : null;

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

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("lands")
    .insert({
      id: `manual-${crypto.randomUUID()}`,
      name,
      address: optionalText(body.address),
      lat,
      lng,
      price,
      area_sqm: areaSqm,
      memo: optionalText(body.memo) ?? "",
      elevation,
      tsunami_risk: tsunamiRisk,
      source_site: "manual",
      fetched_at: new Date().toISOString(),
    })
    .select(
      "id, name, address, lat, lng, price, area_sqm, memo, elevation, school_elementary, school_junior_high, tsunami_risk, source_site, source_url, image_url, external_id",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ land: rowToLand(data as LandRow) });
}
