"use client";

import { useEffect, useRef, useState } from "react";

import { getTransactionTypeLabel } from "@/lib/format";
import { loadKakaoMapsSdk } from "@/lib/kakao-map-client";
import type { PublicListing } from "@/lib/leads";
import { SERVICE_MAP_POINTS } from "@/lib/service-area";

function getMarkerColor(transactionType: PublicListing["transactionType"]) {
  if (transactionType === "sale") {
    return "#ff7a45";
  }

  if (transactionType === "jeonse") {
    return "#00a88f";
  }

  if (transactionType === "monthly") {
    return "#4376ff";
  }

  return "#7c3aed";
}

function createMarkerImage(kakao: any, transactionType: PublicListing["transactionType"], selected: boolean) {
  const size = selected ? 24 : 18;
  const outline = selected ? "#ffffff" : "rgba(255,255,255,0.92)";
  const shadow = selected ? "rgba(67, 118, 255, 0.34)" : "rgba(15, 23, 42, 0.16)";
  const fill = getMarkerColor(transactionType);
  const radius = selected ? 9 : 7;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.6" flood-color="${shadow}" flood-opacity="1" />
        </filter>
      </defs>
      <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="${fill}" stroke="${outline}" stroke-width="${selected ? 3 : 2}" filter="url(#shadow)" />
    </svg>
  `.trim();

  return new kakao.maps.MarkerImage(
    `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    new kakao.maps.Size(size, size),
    {
      offset: new kakao.maps.Point(size / 2, size / 2),
    },
  );
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
        try {
          if (!isMounted || !containerRef.current) {
            return;
          }

          const map = new kakao.maps.Map(containerRef.current, {
            center: new kakao.maps.LatLng(SERVICE_MAP_POINTS[0].lat, SERVICE_MAP_POINTS[0].lng),
            level: 7,
          });

          let clusterer: any = null;

          if (typeof kakao.maps.MarkerClusterer === "function") {
            clusterer = new kakao.maps.MarkerClusterer({
              map,
              averageCenter: true,
              minLevel: 6,
              disableClickZoom: true,
              styles: [
                {
                  width: "46px",
                  height: "46px",
                  background: "linear-gradient(135deg, rgba(86, 125, 255, 0.96), rgba(63, 98, 223, 0.96))",
                  borderRadius: "23px",
                  color: "#ffffff",
                  textAlign: "center",
                  fontWeight: "800",
                  lineHeight: "46px",
                  border: "3px solid rgba(255, 255, 255, 0.96)",
                  boxShadow: "0 14px 30px rgba(63, 98, 223, 0.3)",
                },
                {
                  width: "54px",
                  height: "54px",
                  background: "linear-gradient(135deg, rgba(74, 109, 248, 0.98), rgba(50, 82, 202, 0.98))",
                  borderRadius: "27px",
                  color: "#ffffff",
                  textAlign: "center",
                  fontWeight: "800",
                  lineHeight: "54px",
                  border: "3px solid rgba(255, 255, 255, 0.98)",
                  boxShadow: "0 16px 34px rgba(48, 76, 183, 0.34)",
                },
                {
                  width: "62px",
                  height: "62px",
                  background: "linear-gradient(135deg, rgba(53, 87, 214, 0.98), rgba(31, 61, 169, 0.98))",
                  borderRadius: "31px",
                  color: "#ffffff",
                  textAlign: "center",
                  fontWeight: "900",
                  lineHeight: "62px",
                  border: "3px solid rgba(255, 255, 255, 0.98)",
                  boxShadow: "0 18px 40px rgba(32, 57, 153, 0.36)",
                },
              ],
              calculator: [6, 12, 24],
            });

            kakao.maps.event.addListener(clusterer, "clusterclick", (cluster: any) => {
              map.setLevel(Math.max(3, map.getLevel() - 1), {
                anchor: cluster.getCenter(),
              });
            });
          }

          mapRef.current = map;
          clustererRef.current = clusterer;
          setReady(true);
        } catch (mapError) {
          console.error("Failed to initialize Kakao map", mapError);
          setError(mapError instanceof Error ? mapError.message : "지도를 초기화하지 못했습니다.");
        }
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
      const safeListings = listings.filter((listing) => Number.isFinite(listing.latitude) && Number.isFinite(listing.longitude));

      if (clusterer) {
        clusterer.clear();
      }
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];

      if (safeListings.length === 0) {
        const emptyBounds = new kakao.maps.LatLngBounds();
        SERVICE_MAP_POINTS.forEach((point) => {
          emptyBounds.extend(new kakao.maps.LatLng(point.lat, point.lng));
        });
        map.setBounds(emptyBounds);
        return;
      }

      const bounds = new kakao.maps.LatLngBounds();
      const markers = safeListings.map((listing) => {
        const position = new kakao.maps.LatLng(listing.latitude, listing.longitude);
        const marker = new kakao.maps.Marker({
          position,
          clickable: true,
          image: createMarkerImage(kakao, listing.transactionType, listing.id === selectedListingId),
          title: `${getTransactionTypeLabel(listing.transactionType)} ${listing.region3DepthName ?? "허용 지역"} 매물`,
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

      if (selectedListingId) {
        const selectedListing = safeListings.find((listing) => listing.id === selectedListingId);
        if (selectedListing) {
          map.panTo(new kakao.maps.LatLng(selectedListing.latitude, selectedListing.longitude));
          return;
        }
      }

      map.setBounds(bounds);
    } catch (mapError) {
      console.error("Failed to render Kakao markers", mapError);
      setError(mapError instanceof Error ? mapError.message : "지도 마커를 그리지 못했습니다.");
    }
  }, [listings, onSelect, ready, selectedListingId]);

  if (error) {
    return (
      <div className="market-map-shell">
        <div className="map-fallback">
          <strong>지도를 불러오지 못했습니다.</strong>
          <p>{error}</p>
          <p>현재는 리스트 기반으로만 공개 매물을 둘러볼 수 있습니다.</p>
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
