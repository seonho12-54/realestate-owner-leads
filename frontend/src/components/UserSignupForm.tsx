"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Link } from "@/components/RouterLink";
import { useSession } from "@/context/SessionContext";
import { signupUser } from "@/lib/auth";
import { readLocationAccessCache, writeLocationAccessCache } from "@/lib/location-access";
import { useRouter } from "@/lib/router";
import { SERVICE_REGION_LABEL } from "@/lib/service-area";

function getInsecureContextMessage() {
  return "현재 주소가 HTTP라서 브라우저 위치 권한이 제한될 수 있습니다. HTTPS 주소에서 다시 시도해 주세요.";
}

export function UserSignupForm({ nextUrl = "/" }: { nextUrl?: string }) {
  const router = useRouter();
  const { refreshSession } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [locationMessage, setLocationMessage] = useState(`회원가입 전 허용 지역(${SERVICE_REGION_LABEL}) 위치 인증을 한 번만 완료해 주세요.`);
  const [isLocationVerified, setIsLocationVerified] = useState(false);
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const cached = readLocationAccessCache();

    if (!cached) {
      return;
    }

    setIsLocationVerified(true);
    setLocationMessage(
      cached.addressName
        ? `${cached.addressName}에서 인증된 사용자입니다. 저장된 위치 인증을 재사용하므로 다시 확인할 필요가 없습니다.`
        : "이미 위치 인증을 마친 사용자입니다. 저장된 인증 상태를 그대로 사용합니다.",
    );
  }, []);

  async function handleLocationVerification() {
    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      setLocationMessage(getInsecureContextMessage());
      return;
    }

    if (!navigator.geolocation) {
      setLocationMessage("현재 브라우저에서는 위치 서비스를 지원하지 않습니다.");
      return;
    }

    setIsCheckingLocation(true);
    setError(null);
    setLocationMessage("현재 위치를 확인하고 있습니다.");

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
            throw new Error(result.error ?? "위치 인증에 실패했습니다.");
          }

          if (!result.allowed) {
            setIsLocationVerified(false);
            setLocationMessage(`${result.addressName ?? "현재 위치"}에서는 회원가입 인증을 진행할 수 없습니다.`);
            return;
          }

          writeLocationAccessCache({
            approvedAt: Date.now(),
            addressName: result.addressName ?? null,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });

          setIsLocationVerified(true);
          setLocationMessage(`${result.addressName ?? SERVICE_REGION_LABEL}에서 인증이 완료되었습니다. 이후에는 다시 위치 인증할 필요가 없습니다.`);
        } catch (locationError) {
          setIsLocationVerified(false);
          setLocationMessage(locationError instanceof Error ? locationError.message : "위치 인증에 실패했습니다.");
        } finally {
          setIsCheckingLocation(false);
        }
      },
      (geoError) => {
        setIsCheckingLocation(false);
        setIsLocationVerified(false);

        if (geoError.code === geoError.PERMISSION_DENIED) {
          setLocationMessage("브라우저에서 위치 권한을 허용한 뒤 다시 시도해 주세요.");
          return;
        }

        if (geoError.code === geoError.TIMEOUT) {
          setLocationMessage("위치 확인 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.");
          return;
        }

        setLocationMessage("현재 위치를 가져오지 못했습니다.");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 1000 * 60 * 5,
      },
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!isLocationVerified) {
      setError("회원가입 전에 위치 인증을 먼저 완료해 주세요.");
      return;
    }

    try {
      setIsSubmitting(true);
      await signupUser({ name, email, phone, password });
      await refreshSession();
      router.replace(nextUrl);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "회원가입에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-card signup-card vibrant" onSubmit={handleSubmit}>
      <span className="eyebrow">JOIN DOWNY</span>
      <h1 className="page-title">회원가입</h1>
      <p className="page-copy">
        지도와 공개 목록은 비회원도 볼 수 있지만, 상세 페이지와 매물 접수는 회원가입 후 이용할 수 있습니다.
      </p>

      <section className="signup-verify-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">1. 위치 인증</span>
            <h2 className="section-title">처음 한 번만 위치를 확인합니다</h2>
          </div>
          <button type="button" className="button button-secondary" onClick={handleLocationVerification} disabled={isCheckingLocation}>
            {isCheckingLocation ? "확인 중..." : isLocationVerified ? "다시 확인" : "현재 위치 인증"}
          </button>
        </div>
        <p className="page-copy compact-copy">{locationMessage}</p>
        <div className="inline-note-list">
          <span className={`inline-note${isLocationVerified ? " success" : ""}`}>
            {isLocationVerified ? "인증된 사용자입니다" : `허용 지역: ${SERVICE_REGION_LABEL}`}
          </span>
          {isLocationVerified ? <span className="inline-note success">위치 인증은 저장되어 이후에도 재사용됩니다.</span> : null}
        </div>
      </section>

      <div className="field">
        <label htmlFor="signupName">이름</label>
        <input id="signupName" className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="이름" />
      </div>
      <div className="field">
        <label htmlFor="signupEmail">이메일</label>
        <input
          id="signupEmail"
          className="input"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          inputMode="email"
          placeholder="you@example.com"
        />
      </div>
      <div className="field">
        <label htmlFor="signupPhone">전화번호</label>
        <input
          id="signupPhone"
          className="input"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          inputMode="tel"
          placeholder="010-1234-5678"
        />
      </div>
      <div className="field">
        <label htmlFor="signupPassword">비밀번호</label>
        <input
          id="signupPassword"
          className="input"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="영문과 숫자를 포함한 8자 이상"
        />
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <button className="button button-primary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "가입 중..." : "회원가입"}
      </button>

      <div className="button-row">
        <Link href={`/login?next=${encodeURIComponent(nextUrl)}`} className="button button-secondary button-small">
          로그인
        </Link>
        <Link href="/admin/login" className="button button-ghost button-small">
          관리자 로그인
        </Link>
      </div>
    </form>
  );
}
