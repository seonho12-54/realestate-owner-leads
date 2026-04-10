const SAVED_KEY = "stitch.saved.listings";
const RECENT_KEY = "stitch.recent.listings";

function readNumberList(key: string) {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value): value is number => typeof value === "number") : [];
  } catch {
    return [];
  }
}

function writeNumberList(key: string, values: number[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(values));
}

export function readSavedListingIds() {
  return readNumberList(SAVED_KEY);
}

export function toggleSavedListing(listingId: number) {
  const current = readSavedListingIds();
  const next = current.includes(listingId) ? current.filter((id) => id !== listingId) : [listingId, ...current].slice(0, 40);
  writeNumberList(SAVED_KEY, next);
  return next;
}

export function isSavedListing(listingId: number) {
  return readSavedListingIds().includes(listingId);
}

export function readRecentListingIds() {
  return readNumberList(RECENT_KEY);
}

export function pushRecentListing(listingId: number) {
  const current = readRecentListingIds().filter((id) => id !== listingId);
  const next = [listingId, ...current].slice(0, 20);
  writeNumberList(RECENT_KEY, next);
  return next;
}
