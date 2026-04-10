import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { SellLeadForm } from "@/components/SellLeadForm";
import { useSession } from "@/context/SessionContext";
import { listActiveOffices, type OfficeOption } from "@/lib/offices";

export function SellPage() {
  const { session } = useSession();
  const [offices, setOffices] = useState<OfficeOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
        setError(loadError instanceof Error ? loadError.message : "중개사무소 목록을 불러오지 못했어요.");
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
      session.region.region
        ? {
            latitude: session.region.region.centerLat,
            longitude: session.region.region.centerLng,
          }
        : null,
    [session.region.region],
  );

  if (session.isLoading) {
    return (
      <div className="page-stack">
        <section className="page-panel">
          <span className="eyebrow">문의 등록</span>
          <h1 className="page-title page-title-medium">문의 등록 화면을 준비하고 있어요.</h1>
        </section>
      </div>
    );
  }

  if (!session.authenticated) {
    return (
      <div className="page-stack">
        <section className="locked-state-card">
          <span className="eyebrow">로그인 필요</span>
          <h1 className="page-title page-title-medium">문의 등록은 로그인 후 이용할 수 있어요.</h1>
          <p className="page-copy">가입 후 우리 동네 인증을 완료하면 인증된 지역에서만 문의 등록을 할 수 있어요.</p>
          <div className="button-row">
            <Link to="/login?next=/sell" className="button button-primary">
              로그인
            </Link>
            <Link to="/signup?next=/sell" className="button button-secondary">
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
        <section className="locked-state-card">
          <span className="eyebrow">지역 잠금 필요</span>
          <h1 className="page-title page-title-medium">문의 등록 전에 우리 동네 인증을 완료해 주세요.</h1>
          <p className="page-copy">일반 사용자는 인증된 지역의 문의만 등록할 수 있어요. 위치가 바뀌었다면 설정에서 다시 인증하면 됩니다.</p>
          <div className="button-row">
            <Link to="/me" className="button button-primary">
              설정으로 이동
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
          <span className="eyebrow">문의 등록</span>
          <h1 className="page-title page-title-medium">등록에 필요한 정보를 불러오고 있어요.</h1>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-stack">
        <section className="page-panel">
          <span className="eyebrow">오류</span>
          <h1 className="page-title page-title-medium">문의 등록 화면을 준비하지 못했어요.</h1>
          <p className="page-copy compact-copy">{error}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <span className="eyebrow">문의 등록</span>
          <h1 className="page-title page-title-medium">집 정보를 남기면 문의 접수가 시작돼요</h1>
          <p className="page-copy">기본 정보, 위치, 사진을 남겨 주시면 관리 페이지에서 접수 상태를 확인하고 이어서 관리할 수 있어요.</p>
        </div>
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
