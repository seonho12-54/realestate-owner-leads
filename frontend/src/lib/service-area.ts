export type ServiceArea = {
  label: string;
  region1: string;
  region2: string;
  region3: string;
  center: {
    lat: number;
    lng: number;
  };
};

export const SERVICE_AREAS: ServiceArea[] = [
  {
    label: "울산광역시 중구 다운동",
    region1: "울산광역시",
    region2: "중구",
    region3: "다운동",
    center: {
      lat: 35.5571,
      lng: 129.3292,
    },
  },
  {
    label: "경기도 용인시 처인구 포곡읍",
    region1: "경기도",
    region2: "용인시 처인구",
    region3: "포곡읍",
    center: {
      lat: 37.2799,
      lng: 127.2172,
    },
  },
];

export const SERVICE_REGION_LABEL = SERVICE_AREAS.map((area) => area.label).join(" / ");

export const SERVICE_MAP_CENTER = {
  lat: Number((SERVICE_AREAS.reduce((sum, area) => sum + area.center.lat, 0) / SERVICE_AREAS.length).toFixed(6)),
  lng: Number((SERVICE_AREAS.reduce((sum, area) => sum + area.center.lng, 0) / SERVICE_AREAS.length).toFixed(6)),
};

export const SERVICE_MAP_POINTS = SERVICE_AREAS.map((area) => area.center);

export function createCompactLocation(region2?: string | null, region3?: string | null) {
  return [region2, region3].filter(Boolean).join(" ");
}

export function buildServiceAreaSearchQueries(query: string): string[] {
  const trimmed = query.trim();

  if (!trimmed) {
    return [];
  }

  const values = new Set<string>([
    trimmed,
    ...SERVICE_AREAS.map((area) => `${area.label} ${trimmed}`),
    ...SERVICE_AREAS.map((area) => `${area.region3} ${trimmed}`),
  ]);

  return Array.from(values);
}
