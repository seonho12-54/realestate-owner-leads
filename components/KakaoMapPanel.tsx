"use client";

import { useEffect, useRef, useState } from "react";

import { formatCompactKrw, getTransactionTypeLabel } from "@/lib/format";
import { loadKakaoMapsSdk } from "@/lib/kakao-map-client";
import type { PublicListing } from "@/lib/leads";
import { SERVICE_MAP_POINTS } from "@/lib/service-area";

type OverlayEntry = {
  overlay: any;
  element: HTMLButtonElement;
};

function createMarkerElement(listing: PublicListing, selected: boolean, onClick: () => void) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = `map-marker-chip ${listing.transactionType}${selected ? " is-selected" : ""}`;
  element.innerHTML = [
    `<span class="map-marker-type">${getTransactionTypeLabel(listing.transactionType)}</span>`,
    `<strong class="map-marker-price">${getMarkerPriceText(listing)}</strong>`,
  ].join("");
  element.addEventListener("click", onClick);
  return element;
}

function getMarkerPriceText(listing: PublicListing): string {
  if (listing.transactionType === "sale") {
    return formatCompactKrw(listing.priceKrw);
  }

  if (listing.transactionType === "jeonse") {
    return formatCompactKrw(listing.depositKrw);
  }

  if (listing.transactionType === "monthly") {
    return `${formatCompactKrw(listing.depositKrw)} / ${formatCompactKrw(listing.monthlyRentKrw)}`;
  }

  return "상담";
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
  const overlaysRef = useRef<OverlayEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    loadKakaoMapsSdk()
      .then((kakao) => {
        if (!isMounted || !containerRef.current) {
          return;
        }

        mapRef.current = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(SERVICE_MAP_POINTS[0].lat, SERVICE_MAP_POINTS[0].lng),
          level: 8,
        });

        setReady(true);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "카카오 지도 SDK를 불러오지 못했습니다.");
      });

    return () => {
      isMounted = false;
      overlaysRef.current.forEach(({ overlay, element }) => {
        element.remove();
        overlay.setMap(null);
      });
      overlaysRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || !window.kakao?.maps) {
      return;
    }

    overlaysRef.current.forEach(({ overlay, element }) => {
      element.remove();
      overlay.setMap(null);
    });
    overlaysRef.current = [];

    const kakao = window.kakao;
    const map = mapRef.current;

    if (listings.length === 0) {
      const emptyBounds = new kakao.maps.LatLngBounds();
      SERVICE_MAP_POINTS.forEach((point) => {
        emptyBounds.extend(new kakao.maps.LatLng(point.lat, point.lng));
      });
      map.setBounds(emptyBounds);
      return;
    }

    const bounds = new kakao.maps.LatLngBounds();

    listings.forEach((listing) => {
      const position = new kakao.maps.LatLng(listing.latitude, listing.longitude);
      const element = createMarkerElement(listing, listing.id === selectedListingId, () => onSelect(listing.id));
      const overlay = new kakao.maps.CustomOverlay({
        position,
        content: element,
        yAnchor: 1.08,
        clickable: true,
      });

      overlay.setMap(map);
      overlay.setZIndex(listing.id === selectedListingId ? 30 : 10);
      overlaysRef.current.push({ overlay, element });
      bounds.extend(position);
    });

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
          <p>관리자 승인까지 끝난 매물만 지도에 표시됩니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="market-map-shell">
      <div className="map-legend">
        <span className="map-legend-title">지도 표시</span>
        <span className="map-legend-item sale">매매</span>
        <span className="map-legend-item jeonse">전세</span>
        <span className="map-legend-item monthly">월세</span>
        <span className="map-legend-item neutral">관리자 승인 매물만 노출</span>
      </div>
      <div ref={containerRef} className="map-canvas market-map-canvas" />
    </div>
  );
}
