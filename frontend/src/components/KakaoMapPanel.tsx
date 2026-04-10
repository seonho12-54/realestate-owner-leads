import { useEffect, useRef, useState } from "react";

import { createApproximateListingPoint } from "@/lib/map-privacy";
import type { PublicListing } from "@/lib/leads";
import { loadKakaoMapsSdk } from "@/lib/kakao-map-client";
import { SERVICE_MAP_CENTER } from "@/lib/service-area";

function createMarkerImage(kakao: any, selected: boolean) {
  const size = selected ? 22 : 18;
  const fill = selected ? "#4c6fff" : "#3f87d9";

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${selected ? 7 : 5.5}" fill="${fill}" stroke="rgba(255,255,255,0.98)" stroke-width="${selected ? 4 : 3}" />
    </svg>
  `.trim();

  return new kakao.maps.MarkerImage(`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`, new kakao.maps.Size(size, size), {
    offset: new kakao.maps.Point(size / 2, size / 2),
  });
}

function createAreaOverlay(kakao: any, position: any, selected: boolean) {
  return new kakao.maps.CustomOverlay({
    position,
    yAnchor: 1.95,
    content: `<div class="map-privacy-badge${selected ? " active" : ""}">${selected ? "이 주변 매물" : "주변"}</div>`,
  });
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
  const markersRef = useRef<any[]>([]);
  const circlesRef = useRef<any[]>([]);
  const overlaysRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReset, setShowReset] = useState(false);

  function clearMapObjects() {
    markersRef.current.forEach((marker) => marker.setMap(null));
    circlesRef.current.forEach((circle) => circle.setMap(null));
    overlaysRef.current.forEach((overlay) => overlay.setMap(null));
    markersRef.current = [];
    circlesRef.current = [];
    overlaysRef.current = [];
  }

  useEffect(() => {
    let isMounted = true;

    loadKakaoMapsSdk()
      .then((kakao) => {
        if (!isMounted || !containerRef.current) {
          return;
        }

        const map = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(SERVICE_MAP_CENTER.lat, SERVICE_MAP_CENTER.lng),
          level: 6,
        });

        kakao.maps.event.addListener(map, "dragend", () => setShowReset(true));
        kakao.maps.event.addListener(map, "zoom_changed", () => setShowReset(true));

        mapRef.current = map;
        setReady(true);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "지도를 불러오지 못했어요.");
      });

    return () => {
      isMounted = false;
      clearMapObjects();
    };
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || !window.kakao?.maps) {
      return;
    }

    try {
      const kakao = window.kakao;
      const map = mapRef.current;
      const visibleListings = listings.filter((listing) => Number.isFinite(listing.latitude) && Number.isFinite(listing.longitude));
      const maskedListings = visibleListings.map((listing) => ({
        listing,
        area: createApproximateListingPoint(listing),
      }));

      clearMapObjects();

      if (maskedListings.length === 0) {
        map.setCenter(new kakao.maps.LatLng(SERVICE_MAP_CENTER.lat, SERVICE_MAP_CENTER.lng));
        map.setLevel(7);
        return;
      }

      const bounds = new kakao.maps.LatLngBounds();

      maskedListings.forEach(({ listing, area }) => {
        const selected = listing.id === selectedListingId;
        const position = new kakao.maps.LatLng(area.latitude, area.longitude);
        const marker = new kakao.maps.Marker({
          position,
          clickable: true,
          image: createMarkerImage(kakao, selected),
        });
        const circle = new kakao.maps.Circle({
          center: position,
          radius: area.radiusMeters,
          strokeWeight: selected ? 3 : 2,
          strokeColor: selected ? "#4c6fff" : "#5a86ff",
          strokeOpacity: selected ? 0.9 : 0.5,
          fillColor: selected ? "rgba(76, 111, 255, 0.22)" : "rgba(90, 134, 255, 0.12)",
          fillOpacity: 1,
        });
        const overlay = createAreaOverlay(kakao, position, selected);

        kakao.maps.event.addListener(marker, "click", () => onSelect(listing.id));
        kakao.maps.event.addListener(circle, "click", () => onSelect(listing.id));

        marker.setMap(map);
        circle.setMap(map);
        overlay.setMap(map);

        markersRef.current.push(marker);
        circlesRef.current.push(circle);
        overlaysRef.current.push(overlay);
        bounds.extend(position);
      });

      const selectedListing = maskedListings.find(({ listing }) => listing.id === selectedListingId) ?? null;
      if (selectedListing) {
        map.panTo(new kakao.maps.LatLng(selectedListing.area.latitude, selectedListing.area.longitude));
      } else {
        map.setBounds(bounds);
      }

      setShowReset(false);
    } catch (mapError) {
      setError(mapError instanceof Error ? mapError.message : "지도를 그리지 못했어요.");
    }
  }, [listings, onSelect, ready, selectedListingId]);

  function resetToRegion() {
    if (!mapRef.current || !window.kakao?.maps) {
      return;
    }

    const kakao = window.kakao;
    const visibleListings = listings.filter((listing) => Number.isFinite(listing.latitude) && Number.isFinite(listing.longitude));
    if (visibleListings.length === 0) {
      mapRef.current.setCenter(new kakao.maps.LatLng(SERVICE_MAP_CENTER.lat, SERVICE_MAP_CENTER.lng));
      mapRef.current.setLevel(7);
      setShowReset(false);
      return;
    }

    const bounds = new kakao.maps.LatLngBounds();
    visibleListings.forEach((listing) => {
      const area = createApproximateListingPoint(listing);
      bounds.extend(new kakao.maps.LatLng(area.latitude, area.longitude));
    });
    mapRef.current.setBounds(bounds);
    setShowReset(false);
  }

  if (error) {
    return (
      <div className="map-fallback">
        <strong>지도를 불러오지 못했어요</strong>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="map-shell">
      <div className="map-toolbar">
        <div>
          <strong>지도에서는 주변 권역만 보여줘요</strong>
          <p>정확한 집 위치 대신 문의 가능한 주변 범위를 원형으로 표시합니다.</p>
        </div>
        {showReset ? (
          <button type="button" className="button button-secondary button-small" onClick={resetToRegion}>
            이 지역 다시 보기
          </button>
        ) : null}
      </div>
      <div ref={containerRef} className="map-canvas market-map-canvas" />
    </div>
  );
}
