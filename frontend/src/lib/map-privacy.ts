import type { PublicListing } from "@/lib/leads";

type ApproximateListingPoint = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
};

function hashSeed(input: string) {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function metersToLatitudeDegrees(meters: number) {
  return meters / 111_320;
}

function metersToLongitudeDegrees(meters: number, latitude: number) {
  const safeCosine = Math.max(Math.cos((latitude * Math.PI) / 180), 0.35);
  return meters / (111_320 * safeCosine);
}

export function createApproximateListingPoint(listing: Pick<PublicListing, "id" | "latitude" | "longitude">): ApproximateListingPoint {
  const seed = hashSeed(`${listing.id}:${listing.latitude.toFixed(5)}:${listing.longitude.toFixed(5)}`);
  const angle = ((seed % 360) * Math.PI) / 180;
  const distanceMeters = 85 + ((seed >>> 8) % 75);
  const radiusMeters = 90 + ((seed >>> 16) % 45);

  const latOffset = metersToLatitudeDegrees(distanceMeters) * Math.sin(angle);
  const lngOffset = metersToLongitudeDegrees(distanceMeters, listing.latitude) * Math.cos(angle);

  return {
    latitude: listing.latitude + latOffset,
    longitude: listing.longitude + lngOffset,
    radiusMeters,
  };
}

export function getApproximateLocationLabel(listing: PublicListing, regionName: string) {
  return `${listing.region3DepthName ?? regionName} / 정확한 위치는 문의 후 안내`;
}
