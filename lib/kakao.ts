import { getEnv } from "@/lib/env";
import { isAllowedServiceArea } from "@/lib/service-area";

type KakaoAddressDocument = {
  address_name: string;
  x: string;
  y: string;
  address: {
    address_name: string;
    region_1depth_name: string;
    region_2depth_name: string;
    region_3depth_name: string;
    mountain_yn: string;
    main_address_no: string;
    sub_address_no: string;
    x: string;
    y: string;
  } | null;
  road_address: {
    address_name: string;
    region_1depth_name: string;
    region_2depth_name: string;
    region_3depth_name: string;
    road_name: string;
    building_name: string;
    main_building_no: string;
    sub_building_no: string;
    zone_no: string;
    x: string;
    y: string;
  } | null;
};

type KakaoRegionDocument = {
  region_type: "B" | "H";
  address_name: string;
  region_1depth_name: string;
  region_2depth_name: string;
  region_3depth_name: string;
  region_4depth_name: string;
  code: string;
  x: number;
  y: number;
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

export async function searchAddresses(query: string): Promise<AddressSearchResult[]> {
  const url = new URL("https://dapi.kakao.com/v2/local/search/address.json");
  url.searchParams.set("query", query);
  url.searchParams.set("analyze_type", "similar");

  const response = await fetch(url, {
    headers: getKakaoHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("주소 검색에 실패했습니다.");
  }

  const payload = (await response.json()) as {
    documents: KakaoAddressDocument[];
  };

  return payload.documents
    .map((document) => {
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
    })
    .filter((item): item is AddressSearchResult => Boolean(item));
}

export async function geocodeAddressWithinServiceArea(query: string): Promise<AddressSearchResult> {
  const results = await searchAddresses(query);
  const match = results.find((result) => isAllowedServiceArea(result.region1DepthName, result.region2DepthName));

  if (!match) {
    throw new Error("울산광역시 중구 매물만 등록할 수 있습니다.");
  }

  return match;
}

export async function verifyCoordsWithinServiceArea(latitude: number, longitude: number): Promise<ServiceAreaVerification> {
  const url = new URL("https://dapi.kakao.com/v2/local/geo/coord2regioncode.json");
  url.searchParams.set("x", String(longitude));
  url.searchParams.set("y", String(latitude));

  const response = await fetch(url, {
    headers: getKakaoHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("위치 확인에 실패했습니다.");
  }

  const payload = (await response.json()) as {
    documents: KakaoRegionDocument[];
  };

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
    allowed: isAllowedServiceArea(region.region_1depth_name, region.region_2depth_name),
    addressName: region.address_name,
    region1DepthName: region.region_1depth_name,
    region2DepthName: region.region_2depth_name,
    region3DepthName: region.region_3depth_name,
  };
}

