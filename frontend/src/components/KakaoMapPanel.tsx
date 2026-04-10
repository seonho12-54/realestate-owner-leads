import { useEffect, useRef, useState } from "react";

import type { PublicListing } from "@/lib/leads";
import { loadKakaoMapsSdk } from "@/lib/kakao-map-client";
import { SERVICE_MAP_CENTER } from "@/lib/service-area";

function createMarkerImage(kakao: any, selected: boolean) {
  const size = selected ? 28 : 22;
  const fill = selected ? "#0a9b6f" : "#113f7d";

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${selected ? 9 : 7}" fill="${fill}" stroke="rgba(255,255,255,0.96)" stroke-width="${selected ? 5 : 4}" />
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
}: {
  listings: PublicListing[];
  selectedListingId: number | null;
  onSelect: (listingId: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReset, setShowReset] = useState(false);

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
      const visibleListings = listings.filter((listing) => Number.isFinite(listing.latitude) && Number.isFinite(listing.longitude));

      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];

      if (visibleListings.length === 0) {
        map.setCenter(new kakao.maps.LatLng(SERVICE_MAP_CENTER.lat, SERVICE_MAP_CENTER.lng));
        map.setLevel(7);
        return;
      }

      const bounds = new kakao.maps.LatLngBounds();
      const markers = visibleListings.map((listing) => {
        const position = new kakao.maps.LatLng(listing.latitude, listing.longitude);
        const marker = new kakao.maps.Marker({
          position,
          clickable: true,
          image: createMarkerImage(kakao, listing.id === selectedListingId),
        });

        kakao.maps.event.addListener(marker, "click", () => onSelect(listing.id));
        marker.setMap(map);
        bounds.extend(position);
        return marker;
      });

      markersRef.current = markers;

      const selectedListing = selectedListingId ? visibleListings.find((listing) => listing.id === selectedListingId) : null;
      if (selectedListing) {
        map.panTo(new kakao.maps.LatLng(selectedListing.latitude, selectedListing.longitude));
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
    visibleListings.forEach((listing) => bounds.extend(new kakao.maps.LatLng(listing.latitude, listing.longitude)));
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
          <strong>지도에서 바로 비교하기</strong>
          <p>핀을 누르면 목록 카드도 함께 강조돼요.</p>
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
