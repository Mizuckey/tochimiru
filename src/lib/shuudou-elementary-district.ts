import districtData from "@/data/shuudou-elementary-chomei.json";
import {
  buildChomeiMatchers,
  isInChomeiDistrict,
} from "@/lib/school-district-chomei";

export const SHUUDOU_ELEMENTARY_SCHOOL_NAME = districtData.schoolName;

const CHOMEI_MATCHERS = buildChomeiMatchers(districtData.chomei);

/** 町名リストに基づき修道小学校区域か（一部・除外区域は未考慮） */
export function isInShuudouElementaryDistrict(
  addressOrPlace: string | null | undefined,
): boolean {
  return isInChomeiDistrict(addressOrPlace, CHOMEI_MATCHERS);
}

export function resolveShuudouElementarySchool(
  addressOrPlace: string | null | undefined,
): string | null {
  return isInShuudouElementaryDistrict(addressOrPlace)
    ? SHUUDOU_ELEMENTARY_SCHOOL_NAME
    : null;
}

export function listShuudouElementaryChomei(): readonly string[] {
  return districtData.chomei;
}
