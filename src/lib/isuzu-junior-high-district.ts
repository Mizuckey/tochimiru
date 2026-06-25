import districtData from "@/data/isuzu-junior-high-chomei.json";
import {
  buildChomeiMatchers,
  isInChomeiDistrict,
  localPlaceFromAddress,
} from "@/lib/school-district-chomei";

export const ISUZU_JUNIOR_HIGH_SCHOOL_NAME = districtData.schoolName;

const CHOMEI_MATCHERS = buildChomeiMatchers(districtData.chomei);

export { localPlaceFromAddress };

/** 町名リストに基づき五十鈴中学校区域か（除外区域は未考慮） */
export function isInIsuzuJuniorHighDistrict(
  addressOrPlace: string | null | undefined,
): boolean {
  return isInChomeiDistrict(addressOrPlace, CHOMEI_MATCHERS);
}

export function resolveIsuzuJuniorHighSchool(
  addressOrPlace: string | null | undefined,
): string | null {
  return isInIsuzuJuniorHighDistrict(addressOrPlace)
    ? ISUZU_JUNIOR_HIGH_SCHOOL_NAME
    : null;
}

export function listIsuzuJuniorHighChomei(): readonly string[] {
  return districtData.chomei;
}
