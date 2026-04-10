export type ServiceArea = {
  slug: string;
  name: string;
  city: string;
  district: string;
  neighborhood: string;
  center: {
    lat: number;
    lng: number;
  };
};

export const SERVICE_AREAS: ServiceArea[] = [
  {
    slug: "ulsan-junggu-daun",
    name: "울산광역시 중구 다운동",
    city: "울산광역시",
    district: "중구",
    neighborhood: "다운동",
    center: {
      lat: 35.5571,
      lng: 129.3292,
    },
  },
  {
    slug: "yongin-cheoin-pogok",
    name: "경기도 용인시 처인구 포곡읍",
    city: "경기도",
    district: "용인시 처인구",
    neighborhood: "포곡읍",
    center: {
      lat: 37.2778,
      lng: 127.2308,
    },
  },
  {
    slug: "yongin-cheoin-yubang",
    name: "경기도 용인시 처인구 유방동",
    city: "경기도",
    district: "용인시 처인구",
    neighborhood: "유방동",
    center: {
      lat: 37.2319,
      lng: 127.2112,
    },
  },
  {
    slug: "yongin-cheoin-yeokbuk",
    name: "경기도 용인시 처인구 역북동",
    city: "경기도",
    district: "용인시 처인구",
    neighborhood: "역북동",
    center: {
      lat: 37.237,
      lng: 127.2023,
    },
  },
  {
    slug: "seoul-mapo-seogyo",
    name: "서울특별시 마포구 서교동",
    city: "서울특별시",
    district: "마포구",
    neighborhood: "서교동",
    center: {
      lat: 37.5555,
      lng: 126.9216,
    },
  },
];

export const SERVICE_REGION_LABEL = SERVICE_AREAS.map((area) => area.name).join(" / ");

export const SERVICE_MAP_CENTER = {
  lat: Number((SERVICE_AREAS.reduce((sum, area) => sum + area.center.lat, 0) / SERVICE_AREAS.length).toFixed(6)),
  lng: Number((SERVICE_AREAS.reduce((sum, area) => sum + area.center.lng, 0) / SERVICE_AREAS.length).toFixed(6)),
};

export const SERVICE_MAP_POINTS = SERVICE_AREAS.map((area) => area.center);

export function createCompactLocation(region2?: string | null, region3?: string | null) {
  return [region2, region3].filter(Boolean).join(" ");
}

export function findServiceAreaBySlug(slug?: string | null) {
  if (!slug) {
    return null;
  }

  return SERVICE_AREAS.find((area) => area.slug === slug) ?? null;
}

export function buildServiceAreaSearchQueries(query: string): string[] {
  const trimmed = query.trim();

  if (!trimmed) {
    return [];
  }

  const values = new Set<string>([
    trimmed,
    ...SERVICE_AREAS.map((area) => `${area.name} ${trimmed}`),
    ...SERVICE_AREAS.map((area) => `${area.district} ${area.neighborhood} ${trimmed}`),
    ...SERVICE_AREAS.map((area) => `${area.neighborhood} ${trimmed}`),
  ]);

  return Array.from(values);
}
