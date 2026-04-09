import { useEffect, useRef, useState } from "react";

import type { PublicListing } from "@/lib/leads";
import { loadKakaoMapsSdk } from "@/lib/kakao-map-client";
import { SERVICE_MAP_POINTS } from "@/lib/service-area";

function createMarkerImage(kakao: any, transactionType: PublicListing["transactionType"], selected: boolean) {
  const fill =
    transactionType === "sale" ? "#f48a3d" : transactionType === "jeonse" ? "#149b86" : transactionType === "monthly" ? "#3558f3" : "#64748b";
  const size = selected ? 24 : 20;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${selected ? 8 : 6.5}" fill="${fill}" stroke="rgba(255,255,255,0.96)" stroke-width="${selected ? 4 : 3}" />
    </svg>
  `.trim();

  return new kakao.maps.MarkerImage(`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`, new kakao.maps.Size(size, size), {
    offset: new kakao.maps.Point(size / 2, size / 2),
  });
}

export function KakaoMapPanel({
  listings,
  selectedListingId,
  onSelect,
  transactionFilter,
  onTransactionFilterChange,
}: {
  listings: PublicListing[];
  selectedListingId: number | null;
  onSelect: (listingId: number) => void;
  transactionFilter: string;
  onTransactionFilterChange: (nextValue: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const clustererRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    loadKakaoMapsSdk()
      .then((kakao) => {
        if (!isMounted || !containerRef.current) {
          return;
        }

        const map = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(SERVICE_MAP_POINTS[0].lat, SERVICE_MAP_POINTS[0].lng),
          level: 9,
        });

        const clusterer =
          typeof kakao.maps.MarkerClusterer === "function"
            ? new kakao.maps.MarkerClusterer({
                map,
                averageCenter: true,
                minLevel: 7,
                disableClickZoom: true,
                styles: [
                  {
                    width: "46px",
                    height: "46px",
                    background: "linear-gradient(135deg, rgba(62, 106, 255, 0.96), rgba(24, 58, 166, 0.96))",
                    borderRadius: "23px",
                    color: "#ffffff",
                    textAlign: "center",
                    fontWeight: "800",
                    lineHeight: "46px",
                    border: "3px solid rgba(255,255,255,0.96)",
                    boxShadow: "0 14px 28px rgba(33, 62, 135, 0.25)",
                  },
                  {
                    width: "54px",
                    height: "54px",
                    background: "linear-gradient(135deg, rgba(38, 77, 204, 0.98), rgba(13, 39, 125, 0.98))",
                    borderRadius: "27px",
                    color: "#ffffff",
                    textAlign: "center",
                    fontWeight: "900",
                    lineHeight: "54px",
                    border: "3px solid rgba(255,255,255,0.98)",
                    boxShadow: "0 18px 30px rgba(12, 35, 111, 0.28)",
                  },
                ],
                calculator: [6, 18],
              })
            : null;

        if (clusterer) {
          kakao.maps.event.addListener(clusterer, "clusterclick", (cluster: any) => {
            map.setLevel(Math.max(3, map.getLevel() - 1), {
              anchor: cluster.getCenter(),
            });
          });
        }

        mapRef.current = map;
        clustererRef.current = clusterer;
        setReady(true);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "카카오 지도를 불러오지 못했습니다.");
      });

    return () => {
      isMounted = false;
      if (clustererRef.current) {
        clustererRef.current.clear();
      }
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || !window.kakao?.maps) {
      return;
    }

    try {
      const kakao = window.kakao;
      const map = mapRef.current;
      const clusterer = clustererRef.current;
      const safeListings = (Array.isArray(listings) ? listings : []).filter(
        (listing) => Number.isFinite(listing.latitude) && Number.isFinite(listing.longitude),
      );

      if (clusterer) {
        clusterer.clear();
      }

      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];

      if (safeListings.length === 0) {
        const fallbackBounds = new kakao.maps.LatLngBounds();
        SERVICE_MAP_POINTS.forEach((point) => fallbackBounds.extend(new kakao.maps.LatLng(point.lat, point.lng)));
        map.setBounds(fallbackBounds);
        return;
      }

      const bounds = new kakao.maps.LatLngBounds();
      const markers = safeListings.map((listing) => {
        const position = new kakao.maps.LatLng(listing.latitude, listing.longitude);
        const marker = new kakao.maps.Marker({
          position,
          clickable: true,
          image: createMarkerImage(kakao, listing.transactionType, listing.id === selectedListingId),
        });

        kakao.maps.event.addListener(marker, "click", () => onSelect(listing.id));
        bounds.extend(position);
        return marker;
      });

      markersRef.current = markers;

      if (clusterer) {
        clusterer.addMarkers(markers);
      } else {
        markers.forEach((marker) => marker.setMap(map));
      }

      const selectedListing = selectedListingId ? safeListings.find((listing) => listing.id === selectedListingId) : null;
      if (selectedListing) {
        map.panTo(new kakao.maps.LatLng(selectedListing.latitude, selectedListing.longitude));
        return;
      }

      map.setBounds(bounds);
    } catch (mapError) {
      console.error("Failed to render Kakao map", mapError);
      setError(mapError instanceof Error ? mapError.message : "지도를 그리지 못했습니다.");
    }
  }, [listings, onSelect, ready, selectedListingId]);

  if (error) {
    return (
      <div className="market-map-shell">
        <div className="map-fallback">
          <strong>지도를 불러오지 못했습니다.</strong>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="market-map-shell">
      <div className="map-legend">
        <span className="map-legend-title">지도 안내</span>
        <span className="map-legend-item neutral">가까운 매물은 클러스터로 묶여 표시됩니다.</span>
        <button
          type="button"
          className={`map-legend-item interactive sale${transactionFilter === "sale" ? " active" : ""}`}
          onClick={() => onTransactionFilterChange(transactionFilter === "sale" ? "all" : "sale")}
        >
          매매
        </button>
        <button
          type="button"
          className={`map-legend-item interactive jeonse${transactionFilter === "jeonse" ? " active" : ""}`}
          onClick={() => onTransactionFilterChange(transactionFilter === "jeonse" ? "all" : "jeonse")}
        >
          전세
        </button>
        <button
          type="button"
          className={`map-legend-item interactive monthly${transactionFilter === "monthly" ? " active" : ""}`}
          onClick={() => onTransactionFilterChange(transactionFilter === "monthly" ? "all" : "monthly")}
        >
          월세
        </button>
      </div>
      <div ref={containerRef} className="map-canvas market-map-canvas" />
    </div>
  );
}
