import { useEffect, useRef, useState } from "react";

import { loadKakaoMapsSdk } from "@/lib/kakao-map-client";
import { SERVICE_MAP_CENTER, SERVICE_MAP_POINTS } from "@/lib/service-area";

type AddressCandidate = {
  addressName: string;
  roadAddress: string | null;
  postalCode: string | null;
  latitude: number;
  longitude: number;
  region1DepthName: string;
  region2DepthName: string;
  region3DepthName: string;
};

export function SellMapPreview({
  browserCoords,
  selectedAddress,
  transactionType,
}: {
  browserCoords: { latitude: number; longitude: number } | null;
  selectedAddress: AddressCandidate | null;
  transactionType: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    loadKakaoMapsSdk()
      .then((kakao) => {
        if (!isMounted || !containerRef.current) {
          return;
        }

        mapRef.current = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(SERVICE_MAP_CENTER.lat, SERVICE_MAP_CENTER.lng),
          level: 7,
        });
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "카카오 지도를 불러오지 못했습니다.");
      });

    return () => {
      isMounted = false;
      overlaysRef.current.forEach((overlay) => overlay.setMap(null));
      polylinesRef.current.forEach((polyline) => polyline.setMap(null));
      overlaysRef.current = [];
      polylinesRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !window.kakao?.maps) {
      return;
    }

    const kakao = window.kakao;
    const map = mapRef.current;

    overlaysRef.current.forEach((overlay) => overlay.setMap(null));
    overlaysRef.current = [];
    polylinesRef.current.forEach((polyline) => polyline.setMap(null));
    polylinesRef.current = [];

    const bounds = new kakao.maps.LatLngBounds();

    if (!browserCoords && !selectedAddress) {
      SERVICE_MAP_POINTS.forEach((point) => bounds.extend(new kakao.maps.LatLng(point.lat, point.lng)));
      map.setBounds(bounds);
      return;
    }

    if (browserCoords) {
      const currentPosition = new kakao.maps.LatLng(browserCoords.latitude, browserCoords.longitude);
      bounds.extend(currentPosition);

      const currentOverlay = new kakao.maps.CustomOverlay({
        position: currentPosition,
        xAnchor: 0.5,
        yAnchor: 1.3,
        content: '<div class="sell-map-overlay current">인증 위치</div>',
      });

      currentOverlay.setMap(map);
      overlaysRef.current.push(currentOverlay);
    }

    if (selectedAddress) {
      const targetPosition = new kakao.maps.LatLng(selectedAddress.latitude, selectedAddress.longitude);
      bounds.extend(targetPosition);

      const targetOverlay = new kakao.maps.CustomOverlay({
        position: targetPosition,
        xAnchor: 0.5,
        yAnchor: 1.3,
        content: `<div class="sell-map-overlay target">${transactionType === "sale" ? "매매" : transactionType === "jeonse" ? "전세" : transactionType === "monthly" ? "월세" : "상담"} 등록 주소</div>`,
      });

      targetOverlay.setMap(map);
      overlaysRef.current.push(targetOverlay);

      if (browserCoords) {
        const polyline = new kakao.maps.Polyline({
          map,
          path: [new kakao.maps.LatLng(browserCoords.latitude, browserCoords.longitude), targetPosition],
          strokeWeight: 4,
          strokeColor: "#1d4ed8",
          strokeOpacity: 0.7,
          strokeStyle: "solid",
        });
        polylinesRef.current.push(polyline);
      }
    }

    if (!bounds.isEmpty()) {
      map.setBounds(bounds, 40, 40, 40, 40);
    }
  }, [browserCoords, selectedAddress, transactionType]);

  return (
    <div className="sell-map-shell">
      <div className="sell-map-toolbar">
        <div className="sell-map-status">
          <strong>인증 위치와 등록 주소 미리보기</strong>
          <span>현재 인증 위치와 선택한 주소를 한 화면에서 함께 확인합니다.</span>
        </div>
      </div>

      {error ? (
        <div className="sell-map-empty">
          <strong>지도를 불러오지 못했습니다.</strong>
          <span>{error}</span>
        </div>
      ) : (
        <div ref={containerRef} className="sell-map-canvas" />
      )}

      {!browserCoords && !selectedAddress ? (
        <div className="sell-map-empty">
          <strong>아직 지도에 표시할 위치가 없습니다.</strong>
          <span>마이페이지 위치 인증 후 주소 검색 결과를 선택하면 미리보기가 나타납니다.</span>
        </div>
      ) : null}
    </div>
  );
}
