"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { getTransactionTypeLabel } from "@/lib/format";
import { loadKakaoMapsSdk } from "@/lib/kakao-map-client";
import { SERVICE_MAP_POINTS } from "@/lib/service-area";

type Coordinates = {
  latitude: number;
  longitude: number;
};

type SelectedAddress = {
  addressName: string;
  roadAddress: string | null;
  latitude: number;
  longitude: number;
};

function createOverlayContent(label: string, tone: "current" | "target") {
  const element = document.createElement("div");
  element.className = `sell-map-overlay ${tone}`;
  element.textContent = label;
  return element;
}

export function SellMapPreview({
  browserCoords,
  selectedAddress,
  transactionType,
}: {
  browserCoords: Coordinates | null;
  selectedAddress: SelectedAddress | null;
  transactionType: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const currentOverlayRef = useRef<any>(null);
  const addressOverlayRef = useRef<any>(null);
  const lineRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewLabel = useMemo(() => getTransactionTypeLabel(transactionType), [transactionType]);

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

        setIsReady(true);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "카카오 지도를 불러오지 못했습니다.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isReady || !mapRef.current || !window.kakao?.maps) {
      return;
    }

    currentOverlayRef.current?.setMap(null);
    addressOverlayRef.current?.setMap(null);
    lineRef.current?.setMap(null);

    currentOverlayRef.current = null;
    addressOverlayRef.current = null;
    lineRef.current = null;

    const kakao = window.kakao;
    const bounds = new kakao.maps.LatLngBounds();
    let hasTarget = false;

    if (browserCoords) {
      const currentPosition = new kakao.maps.LatLng(browserCoords.latitude, browserCoords.longitude);
      currentOverlayRef.current = new kakao.maps.CustomOverlay({
        position: currentPosition,
        content: createOverlayContent("내 위치", "current"),
        yAnchor: 1.15,
      });
      currentOverlayRef.current.setMap(mapRef.current);
      bounds.extend(currentPosition);
      hasTarget = true;
    }

    if (selectedAddress) {
      const addressPosition = new kakao.maps.LatLng(selectedAddress.latitude, selectedAddress.longitude);
      addressOverlayRef.current = new kakao.maps.CustomOverlay({
        position: addressPosition,
        content: createOverlayContent(previewLabel, "target"),
        yAnchor: 1.2,
      });
      addressOverlayRef.current.setMap(mapRef.current);
      bounds.extend(addressPosition);
      hasTarget = true;

      if (browserCoords) {
        lineRef.current = new kakao.maps.Polyline({
          path: [new kakao.maps.LatLng(browserCoords.latitude, browserCoords.longitude), addressPosition],
          strokeWeight: 3,
          strokeColor: "#2d6dff",
          strokeOpacity: 0.7,
          strokeStyle: "ShortDash",
        });
        lineRef.current.setMap(mapRef.current);
      }
    }

    if (!hasTarget) {
      const serviceBounds = new kakao.maps.LatLngBounds();
      SERVICE_MAP_POINTS.forEach((point) => {
        serviceBounds.extend(new kakao.maps.LatLng(point.lat, point.lng));
      });
      mapRef.current.setBounds(serviceBounds);
      return;
    }

    if (selectedAddress && browserCoords) {
      mapRef.current.setBounds(bounds);
      return;
    }

    if (selectedAddress) {
      mapRef.current.setCenter(new kakao.maps.LatLng(selectedAddress.latitude, selectedAddress.longitude));
      mapRef.current.setLevel(3);
      return;
    }

    if (browserCoords) {
      mapRef.current.setCenter(new kakao.maps.LatLng(browserCoords.latitude, browserCoords.longitude));
      mapRef.current.setLevel(4);
    }
  }, [browserCoords, isReady, previewLabel, selectedAddress]);

  function focusCurrentLocation() {
    if (!mapRef.current || !window.kakao?.maps || !browserCoords) {
      return;
    }

    mapRef.current.panTo(new window.kakao.maps.LatLng(browserCoords.latitude, browserCoords.longitude));
  }

  function focusSelectedAddress() {
    if (!mapRef.current || !window.kakao?.maps || !selectedAddress) {
      return;
    }

    mapRef.current.panTo(new window.kakao.maps.LatLng(selectedAddress.latitude, selectedAddress.longitude));
  }

  if (error) {
    return (
      <div className="sell-map-empty">
        <strong>지도를 불러오지 못했습니다</strong>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="sell-map-shell">
      <div className="sell-map-toolbar">
        <div className="sell-map-status">
          <strong>등록 위치 미리보기</strong>
          <span>내 위치와 선택한 주소를 한 번에 비교하며 등록 위치를 확인할 수 있습니다.</span>
        </div>
        <div className="button-row">
          <button type="button" className="button button-secondary button-small" onClick={focusCurrentLocation} disabled={!browserCoords}>
            내 위치로 이동
          </button>
          <button type="button" className="button button-secondary button-small" onClick={focusSelectedAddress} disabled={!selectedAddress}>
            선택 주소로 이동
          </button>
        </div>
      </div>
      <div ref={containerRef} className="sell-map-canvas" />
      {!browserCoords && !selectedAddress ? (
        <div className="sell-map-empty">
          <strong>아직 표시할 위치가 없습니다</strong>
          <p>먼저 현재 위치를 확인하고, 아래 주소 검색 결과에서 등록할 주소를 선택해 주세요.</p>
        </div>
      ) : null}
    </div>
  );
}
