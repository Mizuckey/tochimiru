import { readFile } from "node:fs/promises";
import dns from "node:dns/promises";
import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";
import WebSocket from "ws";
import { resolveIsuzuJuniorHighSchool } from "./lib/isuzu-junior-high-district.mjs";

const SOURCE_SITE = "sokenhousing.co.jp";
const LIST_URL = "https://www.sokenhousing.co.jp/tochi_ise/";
const USER_AGENT =
  "tochimiru/0.1 (+local development; contact: site owner via repository)";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.replace("--limit=", "")) : undefined;

await loadEnvFile(".env.local");

const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!mapboxToken) {
  throw new Error("NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is required for geocoding.");
}

if (!dryRun && (!supabaseUrl || !serviceRoleKey)) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required. Use --dry-run to preview without writing.",
  );
}

if (!dryRun) {
  await assertSupabaseReachable(supabaseUrl, serviceRoleKey);
}

await assertRobotsAllowed(LIST_URL);

const parsed = await parseListPage();
const targets = limit ? parsed.slice(0, limit) : parsed;
console.log(`Found ${parsed.length} active listings. Importing ${targets.length}.`);

const lands = [];
for (const [index, item] of targets.entries()) {
  await sleep(index === 0 ? 0 : 700);
  try {
    const geocoded = await geocodeAddress(item.address);
    if (!geocoded) {
      throw new Error(`geocoding failed: ${item.address}`);
    }
    const land = {
      id: `soken-${item.externalId}`,
      name: item.address,
      address: item.address,
      lat: geocoded.lat,
      lng: geocoded.lng,
      price: item.price,
      area_sqm: item.areaSqm,
      memo: item.memo,
      elevation: null,
      school_elementary: null,
      school_junior_high: resolveIsuzuJuniorHighSchool(item.address),
      tsunami_risk: null,
      source_site: SOURCE_SITE,
      source_url: item.sourceUrl,
      image_url: item.imageUrl,
      external_id: item.externalId,
      fetched_at: new Date().toISOString(),
    };
    lands.push(land);
    console.log(`✓ ${land.name} (${land.price}万円)`);
  } catch (error) {
    console.warn(`⚠ No.${item.externalId} ${item.address}: ${error.message}`);
  }
}

if (dryRun) {
  console.log(JSON.stringify(lands, null, 2));
  process.exit(0);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
  realtime: { transport: WebSocket },
});

await preserveOverriddenCoordinates(supabase, lands);

const { error } = await supabase.from("lands").upsert(lands, {
  onConflict: "id",
});

if (error) {
  throw new Error(`Supabase upsert failed: ${error.message}`);
}

console.log(`Imported ${lands.length} lands into Supabase.`);

async function preserveOverriddenCoordinates(supabase, lands) {
  const ids = lands.map((land) => land.id);
  if (ids.length === 0) return;

  const { data, error } = await supabase
    .from("lands")
    .select("id, lat, lng, lat_lng_overridden")
    .in("id", ids)
    .eq("lat_lng_overridden", true);

  if (error) {
    throw new Error(`Supabase coordinate override check failed: ${error.message}`);
  }

  const overriddenById = new Map(data.map((row) => [row.id, row]));
  for (const land of lands) {
    const overridden = overriddenById.get(land.id);
    if (!overridden) continue;
    land.lat = overridden.lat;
    land.lng = overridden.lng;
    land.lat_lng_overridden = true;
  }
}

async function parseListPage() {
  const html = await fetchText(LIST_URL);
  const $ = cheerio.load(html);
  const chunks = $(".bukken_link")
    .toArray()
    .map((el) => ({
      text: normalizeText($(el).text()),
      href: $(el).attr("href"),
      imageUrl: normalizeImageUrl($(el).find("img").first().attr("src")),
    }))
    .filter((chunk) => chunk.text);

  const items = [];
  for (const chunk of chunks) {
    const text = chunk.text;
    const no = text.match(/No\.(\d+)/)?.[1];
    if (!no || text.includes("売却済")) continue;

    const price = parseManYen(text);
    if (!price) continue;

    const address = text.match(/No\.\d+\s+(伊勢市[^\s]+)/)?.[1];
    if (!address) continue;

    const areaSqm = parseAreaSqm(text);
    const afterAddress = text.replace(/^No\.\d+\s+伊勢市[^\s]+\s*/, "");
    const transport = afterAddress.split(/(?:[\d.]+\s*㎡\/)?[\d.]+\s*坪|売土地|[\d,]+(?:\.\d+)?\s*万円/)[0]?.trim();
    const afterPrice = text.split(/[\d,]+\s*万円/).pop()?.trim() ?? "";
    const description = afterPrice
      .replace(/\s*土地\s*.*/, "")
      .replace(/\s*(PRICEDOWN|NEW|特選|おすすめ)\s*/g, " ")
      .trim();

    items.push({
      externalId: no,
      address,
      price,
      areaSqm,
      imageUrl: chunk.imageUrl,
      sourceUrl: chunk.href ? new URL(chunk.href, LIST_URL).toString() : LIST_URL,
      memo: [
        transport ? `交通: ${transport}` : null,
        areaSqm ? `面積: ${areaSqm.toFixed(2)}㎡` : null,
        description ? `概要: ${description}` : null,
      ]
        .filter(Boolean)
        .join(" / "),
    });
  }

  return dedupeByExternalId(items);
}

function normalizeImageUrl(src) {
  if (!src || src.includes("/notyet.")) return null;
  return new URL(src, LIST_URL).toString();
}

function dedupeByExternalId(items) {
  const map = new Map();
  for (const item of items) {
    map.set(item.externalId, item);
  }
  return Array.from(map.values()).sort((a, b) =>
    Number(a.externalId) - Number(b.externalId),
  );
}

function parseManYen(value) {
  const match = value?.match(/([\d,]+(?:\.\d+)?)\s*万円/);
  return match ? Math.round(Number(match[1].replaceAll(",", ""))) : null;
}

function parseAreaSqm(value) {
  const sqmMatch = value?.match(/([\d.]+)\s*㎡/);
  if (sqmMatch) return Number(sqmMatch[1]);

  const tsuboMatch = value?.match(/([\d.]+)\s*坪/);
  if (tsuboMatch) return Number((Number(tsuboMatch[1]) * 3.305785).toFixed(2));

  return null;
}

async function geocodeAddress(address) {
  const query = address.startsWith("三重県") ? address : `三重県${address}`;
  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      query,
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

async function assertRobotsAllowed(targetUrl) {
  const url = new URL(targetUrl);
  const robots = await fetchText(`${url.origin}/robots.txt`);
  const path = url.pathname;
  const disallows = [];
  let applies = false;

  for (const rawLine of robots.split("\n")) {
    const line = rawLine.split("#")[0]?.trim();
    if (!line) continue;
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey?.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      applies = value === "*";
    } else if (applies && key === "disallow" && value) {
      disallows.push(value);
    }
  }

  const blocked = disallows.some((rule) => path.startsWith(rule));
  if (blocked) {
    throw new Error(`robots.txt disallows ${targetUrl}`);
  }
}

async function assertSupabaseReachable(rawUrl, apiKey) {
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

  try {
    const response = await fetch(`${origin}/rest/v1/lands?select=id&limit=1`, {
      headers: {
        apikey: apiKey,
        authorization: `Bearer ${apiKey}`,
      },
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
  } catch (error) {
    throw new Error(
      `Supabase REST API check failed for ${origin}. ${error.message}`,
      { cause: error },
    );
  }
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "user-agent": USER_AGENT },
  });
  if (!response.ok) {
    throw new Error(`GET ${url} failed: ${response.status}`);
  }
  return response.text();
}

function normalizeText(text) {
  return text.replace(/\s+/g, " ").trim();
}

async function sleep(ms) {
  if (ms > 0) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}

async function loadEnvFile(path) {
  let text;
  try {
    text = await readFile(path, "utf8");
  } catch {
    return;
  }

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const [key, ...rest] = line.split("=");
    if (process.env[key]) continue;
    process.env[key] = rest.join("=").trim().replace(/^["']|["']$/g, "");
  }
}
