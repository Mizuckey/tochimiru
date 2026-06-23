import { createHash } from "node:crypto";
import dns from "node:dns/promises";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const API_URL = "https://www.reinfolib.mlit.go.jp/ex-api/external/XIT001";
const STATION_CODE = "007892";
const STATION_NAME = "五十鈴川";
const USER_AGENT =
  "tochimiru/0.1 (+local development; contact: site owner via repository)";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const skipGeocode = args.has("--skip-geocode");
const fromYear = numberArg("--from-year") ?? 2021;
const toYear = numberArg("--to-year") ?? new Date().getFullYear();
const classification = stringArg("--classification"); // 01: 取引価格, 02: 成約価格

await loadEnvFile(".env.local");

const apiKey =
  process.env.REAL_ESTATE_INFO_LIBRARY_API_KEY?.trim() ??
  process.env.MLIT_REINFOLIB_API_KEY?.trim();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim();

const geocodeCache = new Map();

if (!apiKey) {
  throw new Error(
    "REAL_ESTATE_INFO_LIBRARY_API_KEY (or MLIT_REINFOLIB_API_KEY) is required.",
  );
}

if (!dryRun && (!supabaseUrl || !serviceRoleKey)) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required. Use --dry-run to preview without writing.",
  );
}

if (!dryRun && !skipGeocode && !mapboxToken) {
  throw new Error(
    "NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is required for geocoding district locations (or pass --skip-geocode).",
  );
}

if (!dryRun) {
  await assertSupabaseReachable(supabaseUrl, serviceRoleKey);
}

const records = [];
for (let year = fromYear; year <= toYear; year += 1) {
  for (let quarter = 1; quarter <= 4; quarter += 1) {
    const fetched = await fetchTransactions({ year, quarter });
    console.log(`${year} Q${quarter}: ${fetched.length} records`);
    for (const record of fetched) {
      const mapped = mapRecord(record, { year, quarter });
      if (!skipGeocode && mapboxToken) {
        await applyGeocode(mapped);
      }
      records.push(mapped);
    }
    await sleep(500);
  }
}

console.log(`Total mapped records: ${records.length}`);

if (dryRun) {
  console.log(JSON.stringify(records.slice(0, 20), null, 2));
  if (records.length > 20) {
    console.log(`... ${records.length - 20} more records omitted`);
  }
  process.exit(0);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
  realtime: { transport: WebSocket },
});

const chunkSize = 500;
for (let i = 0; i < records.length; i += chunkSize) {
  const chunk = records.slice(i, i + chunkSize);
  const { error } = await supabase.from("market_transactions").upsert(chunk, {
    onConflict: "id",
  });
  if (error) {
    throw new Error(`Supabase upsert failed: ${error.message}`);
  }
}

console.log(`Imported ${records.length} market transactions into Supabase.`);

async function fetchTransactions({ year, quarter }) {
  const url = new URL(API_URL);
  url.searchParams.set("year", String(year));
  url.searchParams.set("quarter", String(quarter));
  url.searchParams.set("station", STATION_CODE);
  url.searchParams.set("language", "ja");
  if (classification) {
    url.searchParams.set("priceClassification", classification);
  }

  const response = await fetch(url, {
    headers: {
      "user-agent": USER_AGENT,
      "Ocp-Apim-Subscription-Key": apiKey,
    },
  });

  if (response.status === 404) {
    return [];
  }
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `XIT001 failed for ${year} Q${quarter}: ${response.status} ${response.statusText} ${body.slice(0, 200)}`,
    );
  }

  const json = await response.json();
  return extractRecords(json);
}

function extractRecords(json) {
  if (Array.isArray(json)) return json;
  for (const key of ["data", "Data", "result", "Result", "records", "Records"]) {
    if (Array.isArray(json?.[key])) return json[key];
  }
  return [];
}

function geocodeQueryForRecord(mapped) {
  const parts = [
    mapped.prefecture,
    mapped.municipality,
    mapped.district_name,
  ].filter(Boolean);
  if (parts.length === 0) return null;
  const joined = parts.join("");
  return joined.startsWith("三重県") ? joined : `三重県${joined}`;
}

async function applyGeocode(mapped) {
  const query = geocodeQueryForRecord(mapped);
  if (!query) return;

  mapped.geocode_query = query;

  if (geocodeCache.has(query)) {
    const cached = geocodeCache.get(query);
    mapped.lat = cached?.lat ?? null;
    mapped.lng = cached?.lng ?? null;
    return;
  }

  const geocoded = await geocodeAddress(query);
  geocodeCache.set(query, geocoded);
  mapped.lat = geocoded?.lat ?? null;
  mapped.lng = geocoded?.lng ?? null;
  await sleep(200);
}

async function geocodeAddress(address) {
  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      address,
    )}.json`,
  );
  url.searchParams.set("access_token", mapboxToken);
  url.searchParams.set("language", "ja");
  url.searchParams.set("country", "jp");
  url.searchParams.set("limit", "1");
  url.searchParams.set("proximity", "136.708,34.487");

  const response = await fetch(url, {
    headers: { "user-agent": USER_AGENT },
  });
  if (!response.ok) return null;

  const data = await response.json();
  const center = data.features?.[0]?.center;
  if (!Array.isArray(center) || center.length < 2) return null;

  return { lng: center[0], lat: center[1] };
}

function mapRecord(record, { year, quarter }) {
  const rawForId = JSON.stringify(record);
  return {
    id: `reinfolib-isuzugawa-${year}-${quarter}-${hash(rawForId)}`,
    station_code: STATION_CODE,
    station_name: STATION_NAME,
    year,
    quarter,
    price_classification: text(record.PriceCategory),
    type: text(record.Type),
    region: text(record.Region),
    municipality_code: text(record.MunicipalityCode),
    prefecture: text(record.Prefecture),
    municipality: text(record.Municipality),
    district_name: text(record.DistrictName),
    trade_price_yen: integer(record.TradePrice),
    price_per_unit: text(record.PricePerUnit),
    unit_price_yen_per_sqm: integer(record.UnitPrice),
    area_sqm: decimal(record.Area),
    land_shape: text(record.LandShape),
    frontage: text(record.Frontage),
    total_floor_area_sqm: decimal(record.TotalFloorArea),
    building_year: text(record.BuildingYear),
    structure: text(record.Structure),
    use: text(record.Use),
    purpose: text(record.Purpose),
    nearest_station: text(record.NearestStation),
    distance_to_nearest_station: text(record.MinTimeToNearestStation),
    period: text(record.Period),
    remarks: text(record.Remarks),
    lat: null,
    lng: null,
    geocode_query: null,
    raw_json: record,
    fetched_at: new Date().toISOString(),
  };
}

function text(value) {
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

function integer(value) {
  const raw = text(value)?.replaceAll(",", "");
  if (!raw || !/^-?\d+$/.test(raw)) return null;
  return Number(raw);
}

function decimal(value) {
  const raw = text(value)?.replaceAll(",", "");
  if (!raw || !/^-?\d+(?:\.\d+)?$/.test(raw)) return null;
  return Number(raw);
}

function hash(value) {
  return createHash("sha1").update(value).digest("hex").slice(0, 16);
}

function stringArg(name) {
  return process.argv
    .find((arg) => arg.startsWith(`${name}=`))
    ?.replace(`${name}=`, "");
}

function numberArg(name) {
  const value = stringArg(name);
  return value ? Number(value) : undefined;
}

async function assertSupabaseReachable(rawUrl, apiKeyValue) {
  let origin;
  try {
    origin = new URL(rawUrl).origin;
  } catch {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL must be a valid URL like https://xxxx.supabase.co",
    );
  }

  const hostname = new URL(origin).hostname;
  try {
    await dns.lookup(hostname);
  } catch (error) {
    throw new Error(
      `Supabase host could not be resolved: ${hostname}. Check NEXT_PUBLIC_SUPABASE_URL in .env.local.`,
      { cause: error },
    );
  }

  const response = await fetch(`${origin}/rest/v1/market_transactions?select=id&limit=1`, {
    headers: {
      apikey: apiKeyValue,
      authorization: `Bearer ${apiKeyValue}`,
    },
  });
  if (!response.ok) {
    throw new Error(
      `Supabase REST API check failed for ${origin}: ${response.status} ${response.statusText}`,
    );
  }
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadEnvFile(path) {
  let textValue;
  try {
    textValue = await readFile(path, "utf8");
  } catch {
    return;
  }

  for (const rawLine of textValue.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const [key, ...rest] = line.split("=");
    if (process.env[key]) continue;
    process.env[key] = rest.join("=").trim().replace(/^["']|["']$/g, "");
  }
}
