export const LOCATION_ACCESS_CACHE_KEY = "downy-location-access";
export const LEGACY_LOCATION_ACCESS_CACHE_KEY = "allowed-location-approved-at";
export const LOCATION_ACCESS_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export type StoredLocationAccess = {
  approvedAt: number;
  addressName: string | null;
  latitude: number;
  longitude: number;
};

export function readLocationAccessCache(): StoredLocationAccess | null {
  if (typeof window === "undefined") {
    return null;
  }

  const cached = window.localStorage.getItem(LOCATION_ACCESS_CACHE_KEY);

  if (!cached) {
    return null;
  }

  try {
    const parsed = JSON.parse(cached) as StoredLocationAccess;

    if (
      typeof parsed.approvedAt !== "number" ||
      typeof parsed.latitude !== "number" ||
      typeof parsed.longitude !== "number" ||
      Date.now() - parsed.approvedAt > LOCATION_ACCESS_TTL_MS
    ) {
      clearLocationAccessCache();
      return null;
    }

    return parsed;
  } catch {
    clearLocationAccessCache();
    return null;
  }
}

export function writeLocationAccessCache(record: StoredLocationAccess) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LOCATION_ACCESS_CACHE_KEY, JSON.stringify(record));
  window.sessionStorage.setItem(LEGACY_LOCATION_ACCESS_CACHE_KEY, String(record.approvedAt));
}

export function clearLocationAccessCache() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(LOCATION_ACCESS_CACHE_KEY);
  window.sessionStorage.removeItem(LEGACY_LOCATION_ACCESS_CACHE_KEY);
}
