export const SERVICE_REGION_1 = "울산광역시";
export const SERVICE_REGION_2 = "중구";
export const SERVICE_REGION_LABEL = `${SERVICE_REGION_1} ${SERVICE_REGION_2}`;

export const SERVICE_MAP_CENTER = {
  lat: 35.5571,
  lng: 129.3292,
};

export const SERVICE_DONGS = [
  "다운동",
  "병영동",
  "복산동",
  "반구동",
  "성안동",
  "우정동",
  "옥교동",
  "태화동",
  "학산동",
  "서동",
  "약사동",
  "유곡동",
  "남외동",
] as const;

export function isAllowedServiceArea(region1?: string | null, region2?: string | null): boolean {
  return region1 === SERVICE_REGION_1 && region2 === SERVICE_REGION_2;
}

export function createCompactLocation(region2?: string | null, region3?: string | null): string {
  return [region2, region3].filter(Boolean).join(" ");
}
