import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function normalizePlaceText(text) {
  return text.normalize("NFKC").replace(/\s+/g, "");
}

function localPlaceFromAddress(address) {
  let s = normalizePlaceText(address);
  s = s.replace(/^三重県/, "");
  s = s.replace(/^伊勢市/, "");
  return s;
}

function entryMatchesLocal(entryNorm, local) {
  if (!local || !entryNorm) return false;
  if (local.startsWith(entryNorm)) return true;
  if (entryNorm.endsWith("町") && !entryNorm.includes("丁目")) {
    const withoutCho = entryNorm.slice(0, -1);
    if (withoutCho.length >= 2 && local.startsWith(withoutCho)) return true;
  }
  return false;
}

function buildChomeiMatchers(chomei) {
  return [...chomei].map(normalizePlaceText).sort((a, b) => b.length - a.length);
}

function isInChomeiDistrict(addressOrPlace, matchers) {
  if (!addressOrPlace?.trim()) return false;
  const local = localPlaceFromAddress(addressOrPlace);
  return matchers.some((entry) => entryMatchesLocal(entry, local));
}

function loadDistrictData(filename) {
  return JSON.parse(
    readFileSync(join(__dirname, "../../src/data", filename), "utf8"),
  );
}

const isuzuData = loadDistrictData("isuzu-junior-high-chomei.json");
export const ISUZU_JUNIOR_HIGH_SCHOOL_NAME = isuzuData.schoolName;

const ISUZU_CHOMEI_MATCHERS = buildChomeiMatchers(isuzuData.chomei);

export function isInIsuzuJuniorHighDistrict(addressOrPlace) {
  return isInChomeiDistrict(addressOrPlace, ISUZU_CHOMEI_MATCHERS);
}

export function resolveIsuzuJuniorHighSchool(addressOrPlace) {
  return isInIsuzuJuniorHighDistrict(addressOrPlace)
    ? ISUZU_JUNIOR_HIGH_SCHOOL_NAME
    : null;
}
