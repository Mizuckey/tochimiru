import { readFile } from "node:fs/promises";
import dns from "node:dns/promises";
import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";
import WebSocket from "ws";
import { resolveIsuzuJuniorHighSchool } from "./lib/isuzu-junior-high-district.mjs";

const SOURCE_SITE = "re.sanco.co.jp";
const BASE_ORIGIN = "https://re.sanco.co.jp";
const LIST_URL = `${BASE_ORIGIN}/precia/nearbyprecia/`;
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

const projectUrls = await fetchIseProjectUrls();
console.log(`Found ${projectUrls.length} Ise Precia project(s).`);

const lands = [];
for (const [index, projectUrl] of projectUrls.entries()) {
  await sleep(index === 0 ? 0 : 700);
  const landUrl = new URL("land/", projectUrl).toString();
  try {
    await assertRobotsAllowed(landUrl);
    const parsed = await parseProjectLandPage(landUrl, projectUrl);
    for (const land of parsed) {
      if (limit !== undefined && lands.length >= limit) break;
      lands.push(land);
      console.log(`✓ ${land.name} (${land.price}万円)`);
    }
  } catch (error) {
    console.warn(`⚠ ${landUrl}: ${error.message}`);
  }
  if (limit !== undefined && lands.length >= limit) break;
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

async function fetchIseProjectUrls() {
  const html = await fetchText(LIST_URL);
  const $ = cheerio.load(html);
  const urls = new Set();

  $("#ise a[href]").each((_, el) => {
    addProjectUrl(urls, $(el).attr("href"));
  });

  $("a[href*='/precia/']").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (/ise|hikarinomachi|伊勢/i.test(href)) {
      addProjectUrl(urls, href);
    }
  });

  return Array.from(urls).sort();
}

function addProjectUrl(set, rawHref) {
  if (!rawHref) return;
  const absolute = new URL(rawHref, BASE_ORIGIN).href;
  const match = absolute.match(
    /^(https:\/\/re\.sanco\.co\.jp\/precia\/(?:house|garden)\/[^/?#]+)\/?$/,
  );
  if (match) {
    set.add(`${match[1]}/`);
  }
}

async function parseProjectLandPage(landUrl, projectUrl) {
  const html = await fetchText(landUrl);
  if (/お探しのページが見つかりません/.test(html)) {
    return [];
  }

  const $ = cheerio.load(html);
  const projectSlug = projectUrl.split("/").filter(Boolean).pop();
  const rawTitle = normalizeText($("title").text()).replace(/【公式】| \|.*/g, "");
  const projectName =
    rawTitle.replace(/^分譲土地｜/, "") || projectSlug;
  const address = extractIseAddress($, html);
  if (!address) {
    throw new Error("could not resolve Ise address");
  }

  const imageUrl = getRepresentativeImageUrl($, landUrl);
  const geocoded = await geocodeAddress(address);
  if (!geocoded) {
    throw new Error(`geocoding failed: ${address}`);
  }

  const lands = [];
  $("table.kakakuhyo tbody tr").each((_, row) => {
    const plot = normalizeText($(row).find("th").first().text()).replace(
      /^NEW\s*/i,
      "",
    );
    if (!plot) return;

    const statusCell = $(row).find("td[colspan]").first();
    if (statusCell.length && /商談中|完売|売約/.test(statusCell.text())) {
      return;
    }

    const cells = $(row)
      .find("td")
      .toArray()
      .map((cell) => normalizeText($(cell).text()));
    const areaSqm = parseSquareMeters(cells[0]);
    const price = parseManYen(cells[1]);
    if (!price) return;

    const externalId = `${projectSlug}-${plot}`;
    lands.push({
      id: `sanco-precia-${externalId}`,
      name: `${projectName} ${plot}号地`,
      address,
      lat: geocoded.lat,
      lng: geocoded.lng,
      price,
      area_sqm: areaSqm,
      memo: buildMemo({ projectName, plot, landUrl, cells }),
      elevation: null,
      school_elementary: null,
      school_junior_high: resolveIsuzuJuniorHighSchool(address),
      tsunami_risk: null,
      source_site: SOURCE_SITE,
      source_url: landUrl,
      image_url: imageUrl,
      external_id: externalId,
      fetched_at: new Date().toISOString(),
    });
  });

  return lands;
}

function extractIseAddress($, html) {
  const description =
    $('meta[name="description"]').attr("content") ??
    $('meta[property="og:description"]').attr("content") ??
    "";
  const fromMeta = description.match(/三重県伊勢市[^の\s、。]+/)?.[0];
  if (fromMeta) return fromMeta;

  const bodyMatch = html.match(/三重県伊勢市[^の\s、。<"]+/);
  return bodyMatch?.[0] ?? null;
}

function buildMemo({ projectName, plot, landUrl, cells }) {
  return [
    `分譲: ${projectName}`,
    `号地: ${plot}`,
    cells[2] ? `参考プラン: ${cells[2]}` : null,
    `建築条件付土地（三交不動産プレシア）`,
    `詳細: ${landUrl}`,
  ]
    .filter(Boolean)
    .join(" / ");
}

function getRepresentativeImageUrl($, pageUrl) {
  const src =
    $("img")
      .toArray()
      .map((el) => $(el).attr("src"))
      .find(
        (value) =>
          value &&
          !value.includes("logo") &&
          !value.includes("icon") &&
          !value.includes("bnr_"),
      ) ?? null;

  return src ? new URL(src, pageUrl).toString() : null;
}

function parseManYen(value) {
  const match = value?.match(/([\d,]+)\s*万円/);
  return match ? Number(match[1].replaceAll(",", "")) : null;
}

function parseSquareMeters(value) {
  const match = value?.match(/([\d.]+)\s*㎡/);
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
