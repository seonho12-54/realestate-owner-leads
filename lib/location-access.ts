export const LOCATION_ACCESS_CACHE_KEY = "allowed-location-approved-at";

export function clearLocationAccessCache() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(LOCATION_ACCESS_CACHE_KEY);
}
