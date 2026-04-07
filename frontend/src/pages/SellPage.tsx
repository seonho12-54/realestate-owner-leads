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
          <span className="eyebrow">매물 접수</span>
          <h1 className="page-title page-title-medium">등록 화면을 준비하고 있습니다</h1>
        </section>
      </div>
    );
  }

  if (!session.authenticated) {
    return (
      <div className="page-stack">
        <section className="sell-stage sell-auth-gate">
          <div className="sell-stage-copy">
            <span className="eyebrow">접수 전용 공간</span>
            <h1 className="sell-stage-title">집주인 매물 접수는 로그인 후 이어집니다</h1>
            <p className="sell-stage-description">
              공개 홈에서는 분위기와 매물 흐름을 볼 수 있고, 실제 접수는 회원 또는 관리자 계정으로 로그인한 뒤 시작됩니다.
            </p>
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
          </div>
          <div className="sell-stage-panels">
            <article className="sell-stage-card">
              <strong>1. 위치 확인은 한 번만</strong>
              <p>회원가입 또는 접수 중 위치 인증을 마치면 이후에는 저장된 인증 상태를 재사용합니다.</p>
            </article>
            <article className="sell-stage-card accent">
              <strong>2. 접수 후 운영 승인</strong>
              <p>매물은 등록 즉시 공개되지 않고, 운영자가 검토를 마친 뒤 지도와 목록에 노출됩니다.</p>
            </article>
          </div>
        </section>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="page-stack">
        <section className="hero-panel compact hero-panel-slim">
          <span className="eyebrow">매물 접수</span>
          <h1 className="page-title page-title-medium">등록 폼과 중개사무소 정보를 불러오는 중입니다</h1>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-stack">
        <section className="hero-panel compact hero-panel-slim">
          <span className="eyebrow">불러오기 실패</span>
          <h1 className="page-title page-title-medium">중개사무소 정보를 가져오지 못했습니다</h1>
          <p className="page-copy compact-copy">{error}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="sell-stage">
        <div className="sell-stage-copy">
          <span className="eyebrow">SELLER DESK</span>
          <h1 className="sell-stage-title">접수는 간단하게, 공개는 검토 후 신중하게</h1>
          <p className="sell-stage-description">
            주소 검색, 위치 확인, 사진 업로드, 개인정보 동의를 한 번에 처리하는 웹 접수 화면입니다. 운영자 승인 이후에만 공개
            매물 목록에 노출됩니다.
          </p>
        </div>
        <div className="sell-stage-panels">
          <article className="sell-stage-card">
            <strong>브라우저 압축 업로드</strong>
            <p>S3 전송 전에 이미지를 브라우저에서 먼저 압축해 저장 비용과 트래픽 부담을 줄입니다.</p>
          </article>
          <article className="sell-stage-card accent">
            <strong>위치 + 주소 이중 검증</strong>
            <p>현재 위치와 검색 주소가 허용 지역에 맞는지 같이 확인한 뒤 접수가 진행됩니다.</p>
          </article>
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
