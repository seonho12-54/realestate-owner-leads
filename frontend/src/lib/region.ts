import type { RegionStatus } from "@/lib/auth";
import { apiRequest } from "@/lib/api";

export type VerifyLocationPayload = {
  latitude: number;
  longitude: number;
};

export async function fetchRegionStatus() {
  return apiRequest<RegionStatus>("/api/region/me");
}

export async function verifyLocation(payload: VerifyLocationPayload) {
  return apiRequest<RegionStatus>("/api/location/verify", {
    method: "POST",
    json: payload,
  });
}

export async function reverifyLocation(payload: VerifyLocationPayload) {
  return apiRequest<RegionStatus>("/api/region/reverify", {
    method: "POST",
    json: payload,
  });
}
