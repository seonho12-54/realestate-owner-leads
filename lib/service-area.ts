export const SERVICE_AREAS = [
  {
    label: "울산광역시 중구 다운동",
    region1: "울산광역시",
    region2: "중구",
    region3: "다운동",
  },
  {
    label: "경기도 용인시 처인구 포곡읍",
    region1: "경기도",
    region2: "용인시 처인구",
    region3: "포곡읍",
  },
] as const;

export const SERVICE_REGION_LABEL = SERVICE_AREAS.map((area) => area.label).join(" / ");

export const SERVICE_MAP_CENTER = {
  lat: 35.5571,
  lng: 129.3292,
};

export function isAllowedServiceArea(region1?: string | null, region2?: string | null, region3?: string | null): boolean {
  return SERVICE_AREAS.some(
    (area) => area.region1 === region1 && area.region2 === region2 && area.region3 === region3,
  );
}

export function createCompactLocation(region2?: string | null, region3?: string | null): string {
  return [region2, region3].filter(Boolean).join(" ");
}
