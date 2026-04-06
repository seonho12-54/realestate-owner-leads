"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

type GateState = "idle" | "checking" | "allowed" | "blocked" | "error";

const CACHE_KEY = "allowed-location-approved-at";
const CACHE_TTL_MS = 1000 * 60 * 30;

function getInsecureContextMessage() {
  return "현재 주소가 HTTP라서 브라우저 위치 권한이 제한될 수 있습니다. HTTPS 도메인으로 접속한 뒤 다시 시도해 주세요.";
}

export function LocationGate({
  children,
  title = "허용 지역 확인 후 둘러볼 수 있어요",
  description = "현재 위치를 확인해 `다운동` 또는 `포곡읍`에서 접속했는지 먼저 확인합니다.",
}: {
  children: ReactNode;
  title?: string;
  description?: string;
}) {
  const [state, setState] = useState<GateState>("idle");
  const [message, setMessage] = useState(description);

  useEffect(() => {
    const cached = window.sessionStorage.getItem(CACHE_KEY);
    if (!cached) {
      return;
    }

    if (Date.now() - Number(cached) < CACHE_TTL_MS) {
      setState("allowed");
    }
  }, []);

  async function requestAccess() {
    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      setState("error");
      setMessage(getInsecureContextMessage());
      return;
    }

    if (!navigator.geolocation) {
      setState("error");
      setMessage("이 브라우저에서는 위치 서비스를 사용할 수 없습니다.");
      return;
    }

    setState("checking");
    setMessage("현재 위치를 확인하고 있습니다.");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch("/api/location/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }),
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error ?? "위치 확인에 실패했습니다.");
          }

          if (!result.allowed) {
            setState("blocked");
            setMessage(`현재 위치(${result.addressName ?? "확인 불가"})에서는 서비스를 이용할 수 없습니다.`);
            return;
          }

          window.sessionStorage.setItem(CACHE_KEY, String(Date.now()));
          setState("allowed");
        } catch (error) {
          setState("error");
          setMessage(error instanceof Error ? error.message : "위치 확인에 실패했습니다.");
        }
      },
      (error) => {
        setState("error");

        if (error.code === error.PERMISSION_DENIED) {
          setMessage("위치 권한이 필요합니다. 브라우저에서 위치 허용 후 다시 시도해 주세요.");
          return;
        }

        if (error.code === error.TIMEOUT) {
          setMessage("위치 확인 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.");
          return;
        }

        setMessage("현재 위치를 가져오지 못했습니다.");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000 * 60 * 5,
        timeout: 15000,
      },
    );
  }

  if (state === "allowed") {
    return <>{children}</>;
  }

  return (
    <div className="gate-panel">
      <span className="eyebrow">Location Access</span>
      <h1 className="page-title">{title}</h1>
      <p className="page-copy">{message}</p>
      <div className="button-row">
        <button type="button" className="button button-primary" onClick={requestAccess} disabled={state === "checking"}>
          {state === "checking" ? "확인 중..." : "위치 확인하고 보기"}
        </button>
      </div>
    </div>
  );
}
