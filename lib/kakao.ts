import { getEnv } from "@/lib/env";
import { buildServiceAreaSearchQueries, SERVICE_REGION_LABEL, isAllowedServiceArea } from "@/lib/service-area";

type KakaoAddressDocument = {
  address_name: string;
  x: string;
  y: string;
  address: {
    address_name: string;
    region_1depth_name: string;
    region_2depth_name: string;
    region_3depth_name: string;
    x: string;
    y: string;
  } | null;
  road_address: {
    address_name: string;
    region_1depth_name: string;
    region_2depth_name: string;
    region_3depth_name: string;
    zone_no: string;
    x: string;
    y: string;
  } | null;
};

type KakaoKeywordDocument = {
  address_name: string;
  road_address_name: string;
  place_name: string;
  x: string;
  y: string;
};

type KakaoRegionDocument = {
  region_type: "B" | "H";
  address_name: string;
  region_1depth_name: string;
  region_2depth_name: string;
  region_3depth_name: string;
};

export type AddressSearchResult = {
  addressName: string;
  roadAddress: string | null;
  postalCode: string | null;
  latitude: number;
  longitude: number;
  region1DepthName: string;
  region2DepthName: string;
  region3DepthName: string;
};

export type ServiceAreaVerification = {
  allowed: boolean;
  addressName: string | null;
  region1DepthName: string | null;
  region2DepthName: string | null;
  region3DepthName: string | null;
};

function getKakaoHeaders() {
  const restApiKey = getEnv().KAKAO_REST_API_KEY;

  if (!restApiKey) {
    throw new Error("KAKAO_REST_API_KEY is missing.");
  }

  return {
    Authorization: `KakaoAK ${restApiKey}`,
  };
}

async function requestKakao<T>(url: URL): Promise<T> {
  const response = await fetch(url, {
    headers: getKakaoHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("카카오 위치 검색 요청에 실패했습니다.");
  }

  return (await response.json()) as T;
}

async function searchAddressDocuments(query: string): Promise<KakaoAddressDocument[]> {
  const url = new URL("https://dapi.kakao.com/v2/local/search/address.json");
  url.searchParams.set("query", query);
  url.searchParams.set("analyze_type", "similar");
  url.searchParams.set("size", "8");

  const payload = await requestKakao<{ documents: KakaoAddressDocument[] }>(url);
  return payload.documents;
}

async function searchKeywordDocuments(query: string): Promise<KakaoKeywordDocument[]> {
  const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
  url.searchParams.set("query", query);
  url.searchParams.set("size", "6");

  const payload = await requestKakao<{ documents: KakaoKeywordDocument[] }>(url);
  return payload.documents;
}

function toAddressResult(document: KakaoAddressDocument): AddressSearchResult | null {
  const regionSource = document.road_address ?? document.address;

  if (!regionSource) {
    return null;
  }

  return {
    addressName: document.address_name,
    roadAddress: document.road_address?.address_name ?? null,
    postalCode: document.road_address?.zone_no ?? null,
    latitude: Number(document.y),
    longitude: Number(document.x),
    region1DepthName: regionSource.region_1depth_name,
    region2DepthName: regionSource.region_2depth_name,
    region3DepthName: regionSource.region_3depth_name,
  };
}

async function toKeywordAddressResult(document: KakaoKeywordDocument): Promise<AddressSearchResult | null> {
  const latitude = Number(document.y);
  const longitude = Number(document.x);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const region = await verifyCoordsWithinServiceArea(latitude, longitude);

  if (!region.allowed || !region.region1DepthName || !region.region2DepthName || !region.region3DepthName) {
    return null;
  }

  return {
    addressName: document.address_name || document.place_name,
    roadAddress: document.road_address_name || null,
    postalCode: null,
    latitude,
    longitude,
    region1DepthName: region.region1DepthName,
    region2DepthName: region.region2DepthName,
    region3DepthName: region.region3DepthName,
  };
}

function dedupeAddressResults(results: AddressSearchResult[]): AddressSearchResult[] {
  const seen = new Set<string>();

  return results.filter((result) => {
    const key = [
      result.roadAddress ?? result.addressName,
      result.latitude.toFixed(6),
      result.longitude.toFixed(6),
    ].join("|");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export async function searchAddresses(query: string): Promise<AddressSearchResult[]> {
  const searchQueries = buildServiceAreaSearchQueries(query).slice(0, 5);

  if (searchQueries.length === 0) {
    return [];
  }

  const addressResponses = await Promise.all(
    searchQueries.map(async (searchQuery) => {
      try {
        return await searchAddressDocuments(searchQuery);
      } catch {
        return [];
      }
    }),
  );

  const keywordResponses = await Promise.all(
    searchQueries.map(async (searchQuery) => {
      try {
        return await searchKeywordDocuments(searchQuery);
      } catch {
        return [];
      }
    }),
  );

  const addressResults = addressResponses
    .flat()
    .map(toAddressResult)
    .filter((result): result is AddressSearchResult => Boolean(result))
    .filter((result) => isAllowedServiceArea(result.region1DepthName, result.region2DepthName, result.region3DepthName));

  const keywordCandidates = keywordResponses.flat().slice(0, 8);
  const keywordResults = (
    await Promise.all(keywordCandidates.map((candidate) => toKeywordAddressResult(candidate)))
  ).filter((result): result is AddressSearchResult => Boolean(result));

  return dedupeAddressResults([...addressResults, ...keywordResults]).slice(0, 12);
}

export async function geocodeAddressWithinServiceArea(query: string): Promise<AddressSearchResult> {
  const results = await searchAddresses(query);
  const match = results.find((result) =>
    isAllowedServiceArea(result.region1DepthName, result.region2DepthName, result.region3DepthName),
  );

  if (!match) {
    throw new Error(`${SERVICE_REGION_LABEL} 주소만 등록할 수 있습니다.`);
  }

  return match;
}

export async function verifyCoordsWithinServiceArea(latitude: number, longitude: number): Promise<ServiceAreaVerification> {
  const url = new URL("https://dapi.kakao.com/v2/local/geo/coord2regioncode.json");
  url.searchParams.set("x", String(longitude));
  url.searchParams.set("y", String(latitude));

  const payload = await requestKakao<{ documents: KakaoRegionDocument[] }>(url);
  const region = payload.documents.find((document) => document.region_type === "H") ?? payload.documents[0];

  if (!region) {
    return {
      allowed: false,
      addressName: null,
      region1DepthName: null,
      region2DepthName: null,
      region3DepthName: null,
    };
  }

  return {
    allowed: isAllowedServiceArea(region.region_1depth_name, region.region_2depth_name, region.region_3depth_name),
    addressName: region.address_name,
    region1DepthName: region.region_1depth_name,
    region2DepthName: region.region_2depth_name,
    region3DepthName: region.region_3depth_name,
  };
}
