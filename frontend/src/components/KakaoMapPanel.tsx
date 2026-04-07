"use client";

import { useEffect, useRef, useState } from "react";

import { getTransactionTypeLabel } from "@/lib/format";
import { loadKakaoMapsSdk } from "@/lib/kakao-map-client";
import type { PublicListing } from "@/lib/leads";
import { SERVICE_MAP_POINTS } from "@/lib/service-area";

function getMarkerColor(transactionType: PublicListing["transactionType"]) {
  if (transactionType === "sale") {
    return "#f97316";
  }

  if (transactionType === "jeonse") {
    return "#0f766e";
  }

  if (transactionType === "monthly") {
    return "#2563eb";
  }

  return "#7c3aed";
}

function createMarkerImage(kakao: any, transactionType: PublicListing["transactionType"], selected: boolean) {
  const size = selected ? 22 : 16;
  const outline = selected ? "#ffffff" : "rgba(255,255,255,0.88)";
  const shadow = selected ? "rgba(15, 118, 110, 0.34)" : "rgba(17, 36, 58, 0.16)";
  const fill = getMarkerColor(transactionType);
  const radius = selected ? 9 : 6;

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
}: {
  listings: PublicListing[];
  selectedListingId: number | null;
  onSelect: (listingId: number) => void;
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
          level: 7,
        });

        const clusterer = new kakao.maps.MarkerClusterer({
          map,
          averageCenter: true,
          minLevel: 6,
          disableClickZoom: true,
          styles: [
            {
              width: "44px",
              height: "44px",
              background: "rgba(77, 113, 255, 0.88)",
              borderRadius: "22px",
              color: "#ffffff",
              textAlign: "center",
              fontWeight: "800",
              lineHeight: "44px",
              border: "2px solid rgba(255, 255, 255, 0.94)",
              boxShadow: "0 12px 28px rgba(70, 99, 219, 0.24)",
            },
            {
              width: "52px",
              height: "52px",
              background: "rgba(70, 99, 219, 0.92)",
              borderRadius: "26px",
              color: "#ffffff",
              textAlign: "center",
              fontWeight: "800",
              lineHeight: "52px",
              border: "2px solid rgba(255, 255, 255, 0.96)",
              boxShadow: "0 14px 30px rgba(58, 82, 184, 0.28)",
            },
            {
              width: "60px",
              height: "60px",
              background: "rgba(50, 79, 194, 0.95)",
              borderRadius: "30px",
              color: "#ffffff",
              textAlign: "center",
              fontWeight: "900",
              lineHeight: "60px",
              border: "2px solid rgba(255, 255, 255, 0.98)",
              boxShadow: "0 16px 34px rgba(41, 65, 160, 0.3)",
            },
          ],
          calculator: [6, 12, 24],
        });

        kakao.maps.event.addListener(clusterer, "clusterclick", (cluster: any) => {
          map.setLevel(Math.max(3, map.getLevel() - 1), {
            anchor: cluster.getCenter(),
          });
        });

        mapRef.current = map;
        clustererRef.current = clusterer;
        setReady(true);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "카카오 지도 SDK를 불러오지 못했습니다.");
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
    if (!ready || !mapRef.current || !clustererRef.current || !window.kakao?.maps) {
      return;
    }

    const kakao = window.kakao;
    const map = mapRef.current;
    const clusterer = clustererRef.current;

    clusterer.clear();
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    if (listings.length === 0) {
      const emptyBounds = new kakao.maps.LatLngBounds();
      SERVICE_MAP_POINTS.forEach((point) => {
        emptyBounds.extend(new kakao.maps.LatLng(point.lat, point.lng));
      });
      map.setBounds(emptyBounds);
      return;
    }

    const bounds = new kakao.maps.LatLngBounds();
    const markers = listings.map((listing) => {
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
    clusterer.addMarkers(markers);

    if (selectedListingId) {
      const selectedListing = listings.find((listing) => listing.id === selectedListingId);

      if (selectedListing) {
        map.panTo(new kakao.maps.LatLng(selectedListing.latitude, selectedListing.longitude));
        return;
      }
    }

    map.setBounds(bounds);
  }, [listings, onSelect, ready, selectedListingId]);

  if (error) {
    return (
      <div className="market-map-shell">
        <div className="map-fallback">
          <strong>지도 준비 필요</strong>
          <p>{error}</p>
          <p>지도에는 승인 매물의 대략 위치와 묶음 개수만 먼저 표시됩니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="market-map-shell">
      <div className="map-legend">
        <span className="map-legend-title">지도 안내</span>
        <span className="map-legend-item neutral">가까운 매물은 자동으로 묶여서 표시됩니다</span>
        <span className="map-legend-item sale">매매</span>
        <span className="map-legend-item jeonse">전세</span>
        <span className="map-legend-item monthly">월세</span>
      </div>
      <div ref={containerRef} className="map-canvas market-map-canvas" />
    </div>
  );
}
