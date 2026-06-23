import districtData from "@/data/shujuu-elementary-chomei.json";
import {
  buildChomeiMatchers,
  isInChomeiDistrict,
} from "@/lib/school-district-chomei";

export const SHUJUU_ELEMENTARY_SCHOOL_NAME = districtData.schoolName;

const CHOMEI_MATCHERS = buildChomeiMatchers(districtData.chomei);

/** 町名リストに基づき進修小学校区域か（一部・除外区域は未考慮） */
export function isInShujuuElementaryDistrict(
  addressOrPlace: string | null | undefined,
): boolean {
  return isInChomeiDistrict(addressOrPlace, CHOMEI_MATCHERS);
}

export function resolveShujuuElementarySchool(
  addressOrPlace: string | null | undefined,
): string | null {
  return isInShujuuElementaryDistrict(addressOrPlace)
    ? SHUJUU_ELEMENTARY_SCHOOL_NAME
    : null;
}

export function listShujuuElementaryChomei(): readonly string[] {
  return districtData.chomei;
}
