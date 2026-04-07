import { useEffect, useState } from "react";
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

  if (session.isLoading) {
    return (
      <div className="page-stack">
        <section className="hero-panel compact hero-panel-slim">
          <span className="eyebrow">매물 등록</span>
          <h1 className="page-title page-title-medium">로그인 상태와 등록 화면을 확인하고 있습니다</h1>
        </section>
      </div>
    );
  }

  if (!session.authenticated) {
    return (
      <div className="page-stack">
        <section className="hero-panel hero-panel-slim">
          <span className="eyebrow">로그인 후 등록</span>
          <h1 className="page-title page-title-medium">매물 등록은 회원 또는 관리자 로그인 후 이용할 수 있어요</h1>
          <p className="page-copy compact-copy">회원가입 후 위치 인증을 한 번만 마치면 매물 접수 흐름을 바로 이어갈 수 있습니다.</p>
          <div className="button-row">
            <Link to="/login?next=/sell" className="button button-primary">
              회원 로그인
            </Link>
            <Link to="/signup?next=/sell" className="button button-secondary">
              회원가입
            </Link>
            <Link to="/admin/login" className="button button-ghost">
              관리자 로그인
            </Link>
          </div>
        </section>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="page-stack">
        <section className="hero-panel compact hero-panel-slim">
          <span className="eyebrow">매물 등록</span>
          <h1 className="page-title page-title-medium">등록 화면을 준비하고 있습니다</h1>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-stack">
        <section className="hero-panel compact hero-panel-slim">
          <span className="eyebrow">오류</span>
          <h1 className="page-title page-title-medium">중개사무소 정보를 불러오지 못했습니다</h1>
          <p className="page-copy compact-copy">{error}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="hero-panel compact hero-panel-slim">
        <div>
          <span className="eyebrow">매물 등록</span>
          <h1 className="page-title page-title-medium">허용 지역 매물만 간단하게 접수해 주세요</h1>
          <p className="page-copy compact-copy">위치 인증과 주소 검색을 통과한 매물만 등록하고, 공개는 관리자 승인 후 진행됩니다.</p>
        </div>
      </section>
      <SellLeadForm
        offices={offices}
        initialOfficeId={session.user?.officeId ?? offices[0]?.id ?? null}
        userName={session.user?.name ?? null}
        userEmail={session.user?.email ?? null}
      />
    </div>
  );
}
