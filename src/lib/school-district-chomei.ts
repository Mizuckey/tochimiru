export function normalizePlaceText(text: string): string {
  return text.normalize("NFKC").replace(/\s+/g, "");
}

/** 住所・所在地文字列から伊勢市以降の町丁目部分を取り出す */
export function localPlaceFromAddress(address: string): string {
  let s = normalizePlaceText(address);
  s = s.replace(/^三重県/, "");
  s = s.replace(/^伊勢市/, "");
  return s;
}

export function entryMatchesLocal(entryNorm: string, local: string): boolean {
  if (!local || !entryNorm) return false;
  if (local.startsWith(entryNorm)) return true;

  if (entryNorm.endsWith("町") && !entryNorm.includes("丁目")) {
    const withoutCho = entryNorm.slice(0, -1);
    if (withoutCho.length >= 2 && local.startsWith(withoutCho)) return true;
  }

  return false;
}

export function buildChomeiMatchers(chomei: readonly string[]): string[] {
  return [...chomei].map(normalizePlaceText).sort((a, b) => b.length - a.length);
}

export function isInChomeiDistrict(
  addressOrPlace: string | null | undefined,
  matchers: readonly string[],
): boolean {
  if (!addressOrPlace?.trim()) return false;
  const local = localPlaceFromAddress(addressOrPlace);
  return matchers.some((entry) => entryMatchesLocal(entry, local));
}
