"use client";

import { useEffect, useRef, useState } from "react";

import { SERVICE_MAP_CENTER } from "@/lib/service-area";
import type { PublicListing } from "@/lib/leads";

declare global {
  interface Window {
    kakao?: any;
  }
}

const KAKAO_SCRIPT_ID = "kakao-maps-sdk";

let kakaoLoaderPromise: Promise<void> | null = null;

function loadKakaoMapsSdk(appKey: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.kakao?.maps) {
    return Promise.resolve();
  }

  if (kakaoLoaderPromise) {
    return kakaoLoaderPromise;
  }

  kakaoLoaderPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(KAKAO_SCRIPT_ID) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", () => {
        window.kakao.maps.load(() => resolve());
      });
      existingScript.addEventListener("error", () => {
        kakaoLoaderPromise = null;
        reject(new Error("카카오 지도 SDK를 불러오지 못했습니다."));
      });
      return;
    }

    const script = document.createElement("script");
    script.id = KAKAO_SCRIPT_ID;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=services,clusterer`;
    script.async = true;
    script.onload = () => {
      window.kakao.maps.load(() => resolve());
    };
    script.onerror = () => {
      kakaoLoaderPromise = null;
      reject(new Error("카카오 지도 SDK를 불러오지 못했습니다."));
    };
    document.head.appendChild(script);
  });

  return kakaoLoaderPromise;
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

  useEffect(() => {
    const appKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

    if (!appKey) {
      setError("카카오 지도 JavaScript 키가 설정되지 않았습니다.");
      return;
    }

    loadKakaoMapsSdk(appKey)
      .then(() => {
        if (!containerRef.current || !window.kakao?.maps) {
          return;
        }

        mapRef.current = new window.kakao.maps.Map(containerRef.current, {
          center: new window.kakao.maps.LatLng(SERVICE_MAP_CENTER.lat, SERVICE_MAP_CENTER.lng),
          level: 6,
        });

        setReady(true);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "카카오 지도를 불러오지 못했습니다.");
      });
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || !window.kakao?.maps) {
      return;
    }

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    if (listings.length === 0) {
      mapRef.current.setCenter(new window.kakao.maps.LatLng(SERVICE_MAP_CENTER.lat, SERVICE_MAP_CENTER.lng));
      return;
    }

    const bounds = new window.kakao.maps.LatLngBounds();

    listings.forEach((listing) => {
      const markerPosition = new window.kakao.maps.LatLng(listing.latitude, listing.longitude);
      const marker = new window.kakao.maps.Marker({
        position: markerPosition,
      });

      marker.setMap(mapRef.current);
      marker.setZIndex(listing.id === selectedListingId ? 20 : 1);

      window.kakao.maps.event.addListener(marker, "click", () => onSelect(listing.id));

      markersRef.current.push(marker);
      bounds.extend(markerPosition);
    });

    if (selectedListingId) {
      const selectedListing = listings.find((listing) => listing.id === selectedListingId);
      if (selectedListing) {
        mapRef.current.panTo(new window.kakao.maps.LatLng(selectedListing.latitude, selectedListing.longitude));
        return;
      }
    }

    mapRef.current.setBounds(bounds);
  }, [listings, onSelect, ready, selectedListingId]);

  if (error) {
    return (
      <div className="map-fallback">
        <strong>지도 준비 필요</strong>
        <p>{error}</p>
        <p>공개된 매물은 관리자 공개 처리와 좌표 저장이 끝나면 지도 마커로 표시됩니다.</p>
      </div>
    );
  }

  return <div ref={containerRef} className="map-canvas" />;
}
