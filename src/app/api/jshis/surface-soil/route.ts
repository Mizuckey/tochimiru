import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  fetchJshisSurfaceSoil,
  JshisSurfaceSoilError,
  surfaceSoilLocationKey,
} from "@/lib/jshis-surface-soil";
import { getSupabaseClient } from "@/lib/supabase";
import type {
  JshisSurfaceSoilVersion,
  SurfaceSoilDto,
  SurfaceSoilResult,
} from "@/types/jshis-surface-soil";

export const dynamic = "force-dynamic";

type CacheRow = {
  location_key: string;
  meshcode: string;
  version: JshisSurfaceSoilVersion;
  geomorphology_code: string | null;
  geomorphology_name: string | null;
  avs30: number | null;
  amplification_factor: number | null;
  fetched_at: string;
};

function rowToDto(row: CacheRow): SurfaceSoilDto {
  return {
    meshcode: row.meshcode,
    version: row.version,
    geomorphologyCode: row.geomorphology_code,
    geomorphologyName: row.geomorphology_name,
    avs30: row.avs30,
    amplificationFactor: row.amplification_factor,
    source: "j-shis",
    fetchedAt: row.fetched_at,
  };
}

function dtoToRow(dto: SurfaceSoilDto, locationKey: string): CacheRow {
  return {
    location_key: locationKey,
    meshcode: dto.meshcode,
    version: dto.version,
    geomorphology_code: dto.geomorphologyCode,
    geomorphology_name: dto.geomorphologyName,
    avs30: dto.avs30,
    amplification_factor: dto.amplificationFactor,
    fetched_at: dto.fetchedAt,
  };
}

function getSupabaseWriteClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

async function readCachedSurfaceSoil(
  locationKey: string,
): Promise<SurfaceSoilDto | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("jshis_surface_soil_cache")
    .select(
      "location_key, meshcode, version, geomorphology_code, geomorphology_name, avs30, amplification_factor, fetched_at",
    )
    .eq("location_key", locationKey)
    .maybeSingle();

  if (error) {
    console.warn("J-SHIS 表層地盤キャッシュの取得をスキップしました:", error.message);
    return null;
  }

  return data ? rowToDto(data as CacheRow) : null;
}

async function writeCachedSurfaceSoil(dto: SurfaceSoilDto, locationKey: string) {
  const supabase = getSupabaseWriteClient();
  if (!supabase) return;

  const { error } = await supabase
    .from("jshis_surface_soil_cache")
    .upsert(dtoToRow(dto, locationKey), { onConflict: "location_key" });

  if (error) {
    console.warn("J-SHIS 表層地盤キャッシュの保存をスキップしました:", error.message);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const locationKey = surfaceSoilLocationKey(lat, lng);

  try {
    const cached = await readCachedSurfaceSoil(locationKey);
    if (cached) {
      return NextResponse.json({
        ok: true,
        data: cached,
        cache: "hit",
      } satisfies SurfaceSoilResult);
    }

    const data = await fetchJshisSurfaceSoil({ lat, lng, version: "V4" });
    await writeCachedSurfaceSoil(data, locationKey);

    return NextResponse.json({
      ok: true,
      data,
      cache: getSupabaseClient() ? "miss" : "unavailable",
    } satisfies SurfaceSoilResult);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "J-SHIS 表層地盤情報を取得できませんでした。";
    const code =
      error instanceof JshisSurfaceSoilError ? error.code : undefined;

    return NextResponse.json(
      {
        ok: false,
        data: null,
        error: { message, code },
        cache: getSupabaseClient() ? "miss" : "unavailable",
      } satisfies SurfaceSoilResult,
      { status: 200 },
    );
  }
}
