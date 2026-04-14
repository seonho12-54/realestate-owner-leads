import { useEffect, useState } from "react";

import { Link } from "@/components/RouterLink";
import { SellLeadForm } from "@/components/SellLeadForm";
import { useSession } from "@/context/SessionContext";
import { ApiError } from "@/lib/api";
import { listActiveOffices, type OfficeOption } from "@/lib/offices";
import { verifyLocation } from "@/lib/region";

type BrowserCoords = {
  latitude: number;
  longitude: number;
};

function canReadBrowserLocation() {
  if (typeof window === "undefined") {
    return false;
  }

  if (!navigator.geolocation) {
    return false;
  }

  return window.isSecureContext || window.location.hostname === "localhost";
}

function getLocationBlockMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === "REGION_CHANGE_REQUIRES_REVERIFY" || error.code === "REGION_ACCESS_DENIED") {
      return "현재 인증된 우리 동네 안에서만 매물 접수를 진행할 수 있어요. 인증된 동네로 이동한 뒤 다시 시도해 주세요.";
    }

    if (error.code === "REGION_UNSUPPORTED") {
      return "현재 위치가 서비스 가능 지역이 아니어서 매물 접수를 진행할 수 없어요.";
    }
  }

  return error instanceof Error ? error.message : "현재 위치를 확인하지 못해 매물 접수를 진행할 수 없어요.";
}

export function CreateLeadPage() {
  const { session } = useSession();
  const [offices, setOffices] = useState<OfficeOption[]>([]);
  const [browserCoords, setBrowserCoords] = useState<BrowserCoords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [locationGate, setLocationGate] = useState<"idle" | "checking" | "allowed" | "blocked">("idle");
  const [locationGateMessage, setLocationGateMessage] = useState<string | null>(null);

  const needsCurrentLocationGate = session.authenticated && session.kind === "user" && session.region.locked;

  useEffect(() => {
    if (session.isLoading) {
      return;
    }

    if (!session.authenticated || (session.kind !== "user" && session.kind !== "admin")) {
      setOffices([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    listActiveOffices()
      .then((response) => {
        if (!isMounted) {
          return;
        }

        setOffices(response);
        setError(null);
      })
      .catch((loadError) => {
        if (!isMounted) {
          return;
        }

        setOffices([]);
        setError(loadError instanceof Error ? loadError.message : "매물 접수에 필요한 중개사무소 목록을 불러오지 못했어요.");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [session.authenticated, session.isLoading, session.kind]);

  useEffect(() => {
    if (session.isLoading) {
      return;
    }

    if (!needsCurrentLocationGate) {
      setBrowserCoords(null);
      setLocationGate("allowed");
      setLocationGateMessage(null);
      return;
    }

    if (!canReadBrowserLocation()) {
      setBrowserCoords(null);
      setLocationGate("blocked");
      setLocationGateMessage("현재 동네에서만 매물 접수를 할 수 있어요. 위치 권한과 HTTPS 환경을 켠 뒤 다시 시도해 주세요.");
      return;
    }

    let isMounted = true;
    setLocationGate("checking");
    setLocationGateMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        if (!isMounted) {
          return;
        }

        setBrowserCoords(coords);

        try {
          const status = await verifyLocation(coords);

          if (!isMounted) {
            return;
          }

          if (status.locked && status.region?.slug === session.region.region?.slug) {
            setLocationGate("allowed");
            setLocationGateMessage(null);
            return;
          }

          setLocationGate("blocked");
          setLocationGateMessage("현재 인증된 우리 동네 안에서만 매물 접수를 진행할 수 있어요. 인증된 동네로 이동한 뒤 다시 시도해 주세요.");
        } catch (verifyError) {
          if (!isMounted) {
            return;
          }

          setLocationGate("blocked");
          setLocationGateMessage(getLocationBlockMessage(verifyError));
        }
      },
      (geoError) => {
        if (!isMounted) {
          return;
        }

        setBrowserCoords(null);
        setLocationGate("blocked");

        if (geoError.code === geoError.PERMISSION_DENIED) {
          setLocationGateMessage("현재 위치 권한이 꺼져 있어 매물 접수를 진행할 수 없어요. 브라우저에서 위치 권한을 허용해 주세요.");
          return;
        }

        setLocationGateMessage("현재 위치를 확인하지 못해 매물 접수를 진행할 수 없어요. 잠시 후 다시 시도해 주세요.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000 * 60 * 5,
      },
    );

    return () => {
      isMounted = false;
    };
  }, [needsCurrentLocationGate, session.isLoading, session.region.region?.slug]);

  if (session.isLoading || isLoading || (needsCurrentLocationGate && locationGate !== "allowed" && locationGate !== "blocked")) {
    return (
      <div className="page-stack">
        <section className="page-panel">
          <span className="eyebrow">매물 접수</span>
          <h1 className="page-title page-title-medium">접수 화면을 준비하고 있어요.</h1>
          <p className="page-copy compact-copy">
            {needsCurrentLocationGate
              ? "현재 위치가 인증된 동네 안에 있는지 확인하고 있어요."
              : "등록 가능한 중개사무소와 계정 상태를 확인하고 있어요."}
          </p>
        </section>
      </div>
    );
  }

  if (!session.authenticated || (session.kind !== "user" && session.kind !== "admin")) {
    return (
      <div className="page-stack">
        <section className="page-panel">
          <span className="eyebrow">매물 접수</span>
          <h1 className="page-title page-title-medium">로그인 후 매물 접수를 진행할 수 있어요.</h1>
          <p className="page-copy compact-copy">접수 내용과 사진 업로드는 로그인 상태에서 바로 이어집니다.</p>
          <div className="button-row" style={{ marginTop: 8 }}>
            <Link href="/login?next=/sell/register" className="button button-primary">
              로그인
            </Link>
            <Link href="/signup?next=/sell/register" className="button button-secondary">
              회원가입
            </Link>
          </div>
        </section>
      </div>
    );
  }

  if (session.kind !== "admin" && !session.region.locked) {
    return (
      <div className="page-stack">
        <section className="page-panel">
          <span className="eyebrow">매물 접수</span>
          <h1 className="page-title page-title-medium">지역 인증 후 매물 접수를 진행해 주세요.</h1>
          <p className="page-copy compact-copy">접수 매물은 인증된 생활권 기준으로 연결되기 때문에 먼저 현재 동네 인증이 필요합니다.</p>
          <div className="button-row" style={{ marginTop: 8 }}>
            <Link href="/" className="button button-primary">
              홈으로 이동
            </Link>
            <Link href="/me" className="button button-secondary">
              내 정보 보기
            </Link>
          </div>
        </section>
      </div>
    );
  }

  if (needsCurrentLocationGate && locationGate === "blocked") {
    return (
      <div className="page-stack">
        <section className="page-panel">
          <span className="eyebrow">매물 접수</span>
          <h1 className="page-title page-title-medium">인증된 동네 안에서만 매물 접수를 할 수 있어요.</h1>
          <p className="page-copy compact-copy">{locationGateMessage}</p>
          <div className="button-row" style={{ marginTop: 8 }}>
            <Link href="/" className="button button-primary">
              홈으로 이동
            </Link>
            <Link href="/me" className="button button-secondary">
              내 정보 보기
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <span className="eyebrow">매물 접수</span>
          <h1 className="page-title page-title-medium">매물 접수 폼으로 바로 이어집니다.</h1>
          <p className="page-copy">주소 검색, 지도 미리보기, 사진 업로드를 한 번에 입력하고 관리자 확인 단계로 넘길 수 있어요.</p>
        </div>
        <div className="hero-region-card">
          <span className="eyebrow" style={{ fontSize: "0.7rem" }}>
            {session.kind === "admin" ? "관리자 접수" : "접수 가능 지역"}
          </span>
          <strong>{session.kind === "admin" ? "관리자 권한으로 접수 중" : session.region.region?.name ?? "인증된 지역"}</strong>
          <p>
            {session.kind === "admin"
              ? "관리자 계정은 바로 접수와 사진 업로드를 진행할 수 있어요."
              : "일반 회원 접수는 현재 인증된 생활권 기준으로 연결되고 사진도 함께 업로드할 수 있어요."}
          </p>
        </div>
      </section>

      {error ? (
        <section className="page-panel">
          <span className="eyebrow">불러오기 실패</span>
          <h2 className="section-title">접수 화면을 준비하지 못했어요.</h2>
          <p className="page-copy compact-copy">{error}</p>
        </section>
      ) : null}

      {offices.length === 0 ? (
        <section className="page-panel">
          <span className="eyebrow">중개사무소</span>
          <h2 className="section-title">현재 선택 가능한 중개사무소가 없어요.</h2>
          <p className="page-copy compact-copy">사무소 정보 확인 후 다시 시도해 주세요.</p>
        </section>
      ) : (
        <SellLeadForm
          offices={offices}
          initialOfficeId={session.user?.officeId ?? offices[0]?.id ?? null}
          userName={session.user?.name ?? null}
          userEmail={session.user?.email ?? null}
          browserCoords={browserCoords}
          isAdmin={session.kind === "admin"}
          verifiedRegionSlug={session.kind === "user" ? session.region.region?.slug ?? null : null}
          verifiedRegionName={session.kind === "user" ? session.region.region?.name ?? null : null}
        />
      )}
    </div>
  );
}
