import {
  resolveShujuuElementarySchool,
  SHUJUU_ELEMENTARY_SCHOOL_NAME,
} from "@/lib/shujuu-elementary-district";
import {
  resolveShuudouElementarySchool,
  SHUUDOU_ELEMENTARY_SCHOOL_NAME,
} from "@/lib/shuudou-elementary-district";

export function inferredElementarySchoolsFromPlace(
  addressOrPlace: string | null | undefined,
): string[] {
  const schools: string[] = [];
  const shujuu = resolveShujuuElementarySchool(addressOrPlace);
  if (shujuu) schools.push(shujuu);
  const shuudou = resolveShuudouElementarySchool(addressOrPlace);
  if (shuudou) schools.push(shuudou);
  return schools;
}

export function resolvedElementaryForLand(land: {
  name: string;
  address?: string;
  schoolDistrict?: { elementary?: string };
}): { display: string | null; inferred: boolean } {
  if (land.schoolDistrict?.elementary) {
    return { display: land.schoolDistrict.elementary, inferred: false };
  }
  for (const text of [land.address, land.name]) {
    if (!text) continue;
    const inferred = inferredElementarySchoolsFromPlace(text);
    if (inferred.length > 0) {
      return { display: inferred.join("・"), inferred: true };
    }
  }
  return { display: null, inferred: false };
}

export function isInShujuuElementaryForLand(land: {
  name: string;
  address?: string;
  schoolDistrict?: { elementary?: string };
}): boolean {
  if (land.schoolDistrict?.elementary === SHUJUU_ELEMENTARY_SCHOOL_NAME) {
    return true;
  }
  for (const text of [land.address, land.name]) {
    if (text && resolveShujuuElementarySchool(text)) return true;
  }
  return false;
}

export function isInShuudouElementaryForLand(land: {
  name: string;
  address?: string;
  schoolDistrict?: { elementary?: string };
}): boolean {
  if (land.schoolDistrict?.elementary === SHUUDOU_ELEMENTARY_SCHOOL_NAME) {
    return true;
  }
  for (const text of [land.address, land.name]) {
    if (text && resolveShuudouElementarySchool(text)) return true;
  }
  return false;
}
