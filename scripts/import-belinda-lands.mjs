import { readFile } from "node:fs/promises";
import dns from "node:dns/promises";
import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";
import WebSocket from "ws";
import { resolveIsuzuJuniorHighSchool } from "./lib/isuzu-junior-high-district.mjs";

const SOURCE_SITE = "belinda.co.jp";
const LIST_URL = "https://belinda.co.jp/category/buy-land/";
const BASE_URL = "https://belinda.co.jp";
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
  const html = await fetchText(LIST_URL);
  const $ = cheerio.load(html);
  const urls = new Set();

  $("a[href]").each((_, el) => {
    const rawHref = $(el).attr("href");
    if (!rawHref) return;
    const href = new URL(rawHref, BASE_URL).toString();
    if (/^https:\/\/belinda\.co\.jp\/buy-land\/\d+\/?$/.test(href)) {
      urls.add(href.endsWith("/") ? href : `${href}/`);
    }
  });

  return Array.from(urls).sort();
}

async function parseDetailPage(url) {
  const html = await fetchText(url);
  const $ = cheerio.load(html);
  const fields = {};

  $("dl div").each((_, el) => {
    const dt = normalizeText($(el).find("dt").first().text());
    const dd = normalizeText($(el).find("dd").first().text());
    if (dt && dd) fields[dt] = dd;
  });

  const address = fields["所在地"];
  if (!address || !address.includes("伊勢市")) {
    return null;
  }

  const urlId = new URL(url).pathname.match(/\/buy-land\/(\d+)\//)?.[1];
  const title = normalizeText($("title").text());
  const externalId = title.match(/物件No\.?([^「|]+)/)?.[1]?.trim() ?? urlId;
  const name = title.match(/「([^」]+)」/)?.[1] ?? address;
  const price = parseManYen(fields["価格"]);
  const areaSqm = parseSquareMeters(fields["土地面積"]);
  const imageUrl = getRepresentativeImageUrl($, url);

  if (!urlId || !price) {
    throw new Error("missing required id or price");
  }

  const geocoded = await geocodeAddress(address);
  if (!geocoded) {
    throw new Error(`geocoding failed: ${address}`);
  }

  return {
    id: `belinda-${urlId}`,
    name,
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

function getRepresentativeImageUrl($, pageUrl) {
  const src =
    $("img")
      .toArray()
      .map((el) => $(el).attr("src"))
      .find((value) => value?.includes("/files/")) ?? null;

  return src ? new URL(src, pageUrl).toString() : null;
}

function buildMemo(fields) {
  return [
    fields["交通"] ? `交通: ${fields["交通"]}` : null,
    fields["坪単価"] ? `坪単価: ${fields["坪単価"]}` : null,
    fields["情報公開日"] ? `情報公開日: ${fields["情報公開日"]}` : null,
    fields["更新予定日"] ? `更新予定日: ${fields["更新予定日"]}` : null,
  ]
    .filter(Boolean)
    .join(" / ");
}

function parseManYen(value) {
  const match = value?.match(/([\d,]+)\s*万円/);
  return match ? Number(match[1].replaceAll(",", "")) : null;
}

function parseSquareMeters(value) {
  const match = value?.match(/([\d.]+)\s*m/);
  return match ? Number(match[1]) : null;
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
