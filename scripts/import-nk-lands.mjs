import { createHash } from "node:crypto";
import dns from "node:dns/promises";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";
import WebSocket from "ws";
import { resolveIsuzuJuniorHighSchool } from "./lib/isuzu-junior-high-district.mjs";

const SOURCE_SITE = "nk-housing.co.jp";
const START_URL = "https://www.nk-housing.co.jp/estate/";
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

await assertRobotsAllowed(START_URL);

const detailUrls = await fetchDetailUrls();
const urls = limit ? detailUrls.slice(0, limit) : detailUrls;
console.log(`Found ${detailUrls.length} detail pages. Importing ${urls.length}.`);

const lands = [];
for (const [index, url] of urls.entries()) {
  await sleep(index === 0 ? 0 : 700);
  try {
    await assertRobotsAllowed(url);
    const land = await parseDetailPage(url);
    if (!land) continue;
    lands.push(land);
    console.log(`✓ ${land.name} (${land.price}万円)`);
  } catch (error) {
    console.warn(`⚠ ${url}: ${error.message}`);
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

const { error } = await supabase.from("lands").upsert(lands, {
  onConflict: "id",
});

if (error) {
  throw new Error(`Supabase upsert failed: ${error.message}`);
}

console.log(`Imported ${lands.length} lands into Supabase.`);

async function fetchDetailUrls() {
  const seenPages = new Set();
  const queue = [START_URL];
  const detailUrls = new Set();

  while (queue.length > 0 && seenPages.size < 10) {
    const pageUrl = queue.shift();
    if (!pageUrl || seenPages.has(pageUrl)) continue;
    seenPages.add(pageUrl);
    await assertRobotsAllowed(pageUrl);

    const html = await fetchText(pageUrl);
    const $ = cheerio.load(html);

    $("a[href]").each((_, el) => {
      const href = new URL($(el).attr("href"), pageUrl).toString();
      const path = new URL(href).pathname;
      if (/^\/estate\/page\/\d+\/?$/.test(path) && !seenPages.has(href)) {
        queue.push(href);
      }
      if (/^\/estate\/[^/]+\/?$/.test(path) && !path.startsWith("/estate/page/")) {
        detailUrls.add(href.endsWith("/") ? href : `${href}/`);
      }
    });
  }

  return Array.from(detailUrls).sort();
}

async function parseDetailPage(url) {
  const html = await fetchText(url);
  const $ = cheerio.load(html);
  const fields = extractFields($);

  const address = fields["物件所在地"] ?? fields["所在地"];
  if (!address || !address.includes("伊勢市")) {
    return null;
  }

  const price = parseManYen(fields["価格"]);
  if (!price) {
    throw new Error("missing required price");
  }

  const pathSlug = decodeURIComponent(new URL(url).pathname)
    .split("/")
    .filter(Boolean)
    .pop();
  const externalId = pathSlug ?? hash(url);
  const title = externalId || address;
  const areaSqm =
    parseNumber(fields["土地面積(㎡)"]) ??
    sqmFromTsubo(parseNumber(fields["土地面積(坪)"]));
  const imageUrl = getRepresentativeImageUrl($, url);

  const geocoded = await geocodeAddress(address);
  if (!geocoded) {
    throw new Error(`geocoding failed: ${address}`);
  }

  return {
    id: `nk-${hash(url)}`,
    name: title,
    address,
    lat: geocoded.lat,
    lng: geocoded.lng,
    price,
    area_sqm: areaSqm,
    memo: buildMemo(fields),
    elevation: null,
    school_elementary: null,
    school_junior_high: resolveIsuzuJuniorHighSchool(address),
    tsunami_risk: null,
    source_site: SOURCE_SITE,
    source_url: url,
    image_url: imageUrl,
    external_id: externalId,
    fetched_at: new Date().toISOString(),
  };
}

function extractFields($) {
  const fields = {};
  $("tr").each((_, tr) => {
    const cells = $(tr).children("th, td").toArray();
    for (let i = 0; i < cells.length - 1; i += 2) {
      const key = normalizeText($(cells[i]).text());
      const value = normalizeText($(cells[i + 1]).text());
      if (key && value) fields[key] = value;
    }
  });
  return fields;
}

function buildMemo(fields) {
  return [
    fields["交通"] ? `交通: ${fields["交通"]}` : null,
    fields["1坪あたりの単価"] ? `坪単価: ${fields["1坪あたりの単価"]}` : null,
    fields["地目"] ? `地目: ${fields["地目"]}` : null,
    fields["用途地域"] ? `用途地域: ${fields["用途地域"]}` : null,
    fields["建築条件"] ? `建築条件: ${fields["建築条件"]}` : null,
  ]
    .filter(Boolean)
    .join(" / ");
}

function getRepresentativeImageUrl($, pageUrl) {
  const src =
    $("img")
      .toArray()
      .map((el) => $(el).attr("src"))
      .find((value) => value?.includes("/cms/wp-content/uploads/")) ?? null;

  return src ? new URL(src, pageUrl).toString() : null;
}

function parseManYen(value) {
  const match = value?.match(/[\d,]+(?:\.\d+)?/);
  return match ? Math.round(Number(match[0].replaceAll(",", ""))) : null;
}

function parseNumber(value) {
  const match = value?.match(/[\d,]+(?:\.\d+)?/);
  return match ? Number(match[0].replaceAll(",", "")) : null;
}

function sqmFromTsubo(value) {
  return value === null ? null : Number((value * 3.305785).toFixed(2));
}

function hash(value) {
  return createHash("sha1").update(value).digest("hex").slice(0, 12);
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
