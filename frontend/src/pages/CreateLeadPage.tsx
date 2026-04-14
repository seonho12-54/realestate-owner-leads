import { useEffect, useState } from "react";

import { Link } from "@/components/RouterLink";
import { SellLeadForm } from "@/components/SellLeadForm";
import { useSession } from "@/context/SessionContext";
import { listActiveOffices, type OfficeOption } from "@/lib/offices";

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

export function CreateLeadPage() {
  const { session } = useSession();
  const [offices, setOffices] = useState<OfficeOption[]>([]);
  const [browserCoords, setBrowserCoords] = useState<BrowserCoords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        setError(loadError instanceof Error ? loadError.message : "매물 접수에 필요한 중개사무소 목록을 불러오지 못했습니다.");
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
    if (session.isLoading || !session.authenticated || !session.region.locked || !canReadBrowserLocation()) {
      return;
    }

    let isMounted = true;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!isMounted) {
          return;
        }

        setBrowserCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        if (isMounted) {
          setBrowserCoords(null);
        }
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
  }, [session.authenticated, session.isLoading, session.region.locked]);

  if (session.isLoading || isLoading) {
    return (
      <div className="page-stack">
        <section className="page-panel">
          <span className="eyebrow">매물 접수</span>
          <h1 className="page-title page-title-medium">접수 화면을 준비하고 있습니다.</h1>
          <p className="page-copy compact-copy">등록 가능한 중개사무소와 현재 계정 상태를 확인한 뒤 바로 입력할 수 있게 불러오고 있습니다.</p>
        </section>
      </div>
    );
  }

  if (!session.authenticated || (session.kind !== "user" && session.kind !== "admin")) {
    return (
      <div className="page-stack">
        <section className="page-panel">
          <span className="eyebrow">매물 접수</span>
          <h1 className="page-title page-title-medium">로그인 후 매물 접수를 진행할 수 있습니다.</h1>
          <p className="page-copy compact-copy">접수 폼과 사진 업로드는 로그인 상태에서 바로 이어집니다.</p>
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

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <span className="eyebrow">매물 접수</span>
          <h1 className="page-title page-title-medium">매물 접수 폼으로 바로 이어집니다.</h1>
          <p className="page-copy">주소 검색, 지도 미리보기, 사진 업로드를 한 번에 입력하고 관리자 확인 단계로 넘길 수 있습니다.</p>
        </div>
        <div className="hero-region-card">
          <span className="eyebrow" style={{ fontSize: "0.7rem" }}>
            {session.kind === "admin" ? "관리자 접수" : "접수 가능 지역"}
          </span>
          <strong>{session.kind === "admin" ? "관리자 권한으로 접수 중" : session.region.region?.name ?? "인증된 지역"}</strong>
          <p>
            {session.kind === "admin"
              ? "관리자 계정은 바로 접수와 사진 업로드를 진행할 수 있습니다."
              : "일반회원 접수는 현재 인증된 생활권 기준으로 저장되고, 사진도 함께 업로드됩니다."}
          </p>
        </div>
      </section>

      {error ? (
        <section className="page-panel">
          <span className="eyebrow">불러오기 실패</span>
          <h2 className="section-title">접수 화면을 열지 못했습니다.</h2>
          <p className="page-copy compact-copy">{error}</p>
        </section>
      ) : null}

      {offices.length === 0 ? (
        <section className="page-panel">
          <span className="eyebrow">중개사무소</span>
          <h2 className="section-title">현재 선택 가능한 중개사무소가 없습니다.</h2>
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
        />
      )}
    </div>
  );
}
