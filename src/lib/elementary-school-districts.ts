import { resolveShujuuElementarySchool } from "@/lib/shujuu-elementary-district";
import { resolveShuudouElementarySchool } from "@/lib/shuudou-elementary-district";

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
