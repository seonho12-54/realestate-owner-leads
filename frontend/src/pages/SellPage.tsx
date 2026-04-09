import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { SellLeadForm } from "@/components/SellLeadForm";
import { useSession } from "@/context/SessionContext";
import { readLocationAccessCache } from "@/lib/location-access";
import { listActiveOffices, type OfficeOption } from "@/lib/offices";

export function SellPage() {
  const { session } = useSession();
  const [offices, setOffices] = useState<OfficeOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [verifiedLocation, setVerifiedLocation] = useState(readLocationAccessCache());

  useEffect(() => {
    const syncVerification = () => {
      setVerifiedLocation(readLocationAccessCache());
    };

    syncVerification();
    window.addEventListener("focus", syncVerification);

    return () => {
      window.removeEventListener("focus", syncVerification);
    };
  }, []);

  useEffect(() => {
    if (!session.authenticated) {
      setOffices([]);
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

        setError(loadError instanceof Error ? loadError.message : "중개사무소 목록을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [session.authenticated]);

  const browserCoords = useMemo(
    () =>
      verifiedLocation
        ? {
            latitude: verifiedLocation.latitude,
            longitude: verifiedLocation.longitude,
          }
        : null,
    [verifiedLocation],
  );

  if (session.isLoading) {
    return (
      <div className="page-stack">
        <section className="page-panel">
          <span className="eyebrow">LOADING</span>
          <h1 className="page-title page-title-medium">매물 접수 화면을 준비하고 있습니다.</h1>
        </section>
      </div>
    );
  }

  if (!session.authenticated) {
    return (
      <div className="page-stack">
        <section className="page-panel centered-panel">
          <span className="eyebrow">회원 전용</span>
          <h1 className="page-title page-title-medium">매물 접수는 로그인 후 이용할 수 있습니다.</h1>
          <p className="page-copy compact-copy">회원가입 후 마이페이지에서 위치 인증을 한 번만 완료하면 이후에는 접수와 수정 기능을 계속 사용할 수 있습니다.</p>
          <div className="button-row">
            <Link to="/login?next=/sell" className="button button-primary">
              로그인
            </Link>
            <Link to="/signup?next=/me" className="button button-secondary">
              회원가입
            </Link>
          </div>
        </section>
      </div>
    );
  }

  if (session.kind !== "admin" && !verifiedLocation) {
    return (
      <div className="page-stack">
        <section className="page-panel centered-panel">
          <span className="eyebrow">위치 인증 필요</span>
          <h1 className="page-title page-title-medium">마이페이지에서 위치 인증을 먼저 완료해 주세요.</h1>
          <p className="page-copy compact-copy">위치 인증은 한 번만 완료하면 되고, 저장된 인증 상태는 이후 접속에서도 그대로 유지됩니다.</p>
          <div className="button-row">
            <Link to="/me" className="button button-primary">
              마이페이지로 이동
            </Link>
            <Link to="/" className="button button-secondary">
              홈으로 이동
            </Link>
          </div>
        </section>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="page-stack">
        <section className="page-panel">
          <span className="eyebrow">LOADING</span>
          <h1 className="page-title page-title-medium">접수에 필요한 중개사무소 정보를 불러오고 있습니다.</h1>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-stack">
        <section className="page-panel">
          <span className="eyebrow">불러오기 실패</span>
          <h1 className="page-title page-title-medium">중개사무소 정보를 불러오지 못했습니다.</h1>
          <p className="page-copy compact-copy">{error}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="page-panel compact-page-header">
        <span className="eyebrow">매물 접수</span>
        <h1 className="page-title page-title-medium">집주인 매물 접수</h1>
      </section>

      <SellLeadForm
        offices={offices}
        initialOfficeId={session.user?.officeId ?? offices[0]?.id ?? null}
        userName={session.user?.name ?? null}
        userEmail={session.user?.email ?? null}
        browserCoords={browserCoords}
        isAdmin={session.kind === "admin"}
      />
    </div>
  );
}
