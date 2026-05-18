import type { IndustryRecord } from "@/types/master";
import { getIndustryCoefficients } from "./load-json";

export function listIndustries(): IndustryRecord[] {
  return getIndustryCoefficients().industries;
}

export function getIndustryByCode(code: string): IndustryRecord | undefined {
  return listIndustries().find((i) => i.code === code);
}

export function getIndustryByLabel(label: string): IndustryRecord | undefined {
  return listIndustries().find((i) => i.label === label);
}

export function getDefaultKPoisson(industryCode: string): number {
  const industry = getIndustryByCode(industryCode);
  if (!industry) {
    throw new Error(`業界マスタが見つかりません: ${industryCode}`);
  }
  return industry.k_poisson.value;
}
