import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";

import { AdminLeadManager } from "@/components/AdminLeadManager";
import { LogoutButton } from "@/components/LogoutButton";
import { useSession } from "@/context/SessionContext";
import { listAdminLeads, type AdminLeadSummary } from "@/lib/leads";
import { leadStatusOptions } from "@/lib/validation";

export function AdminLeadsPage() {
  const { session } = useSession();
  const [searchParams] = useSearchParams();
  const statusParam = searchParams.get("status");
  const statusFilter = leadStatusOptions.some((option) => option.value === statusParam) ? statusParam : null;
  const [leads, setLeads] = useState<AdminLeadSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (session.kind !== "admin") {
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    listAdminLeads(statusFilter)
      .then((response) => {
        if (!isMounted) {
          return;
        }
        setLeads(response);
        setError(null);
      })
      .catch((loadError) => {
        if (!isMounted) {
          return;
        }
        setLeads([]);
        setError(loadError instanceof Error ? loadError.message : "관리자 매물 목록을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [session.kind, statusFilter]);

  const publishedCount = useMemo(() => leads.filter((lead) => lead.isPublished).length, [leads]);
  const locationVerifiedCount = useMemo(() => leads.filter((lead) => lead.locationVerified).length, [leads]);

  if (!session.isLoading && session.kind !== "admin") {
    return <Navigate to="/admin/login" replace />;
  }

  if (isLoading) {
    return (
      <div className="page-stack">
        <section className="hero-panel compact hero-panel-slim">
          <span className="eyebrow">관리자 콘솔</span>
          <h1 className="page-title page-title-medium">운영 데이터를 불러오는 중입니다</h1>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-stack">
        <section className="hero-panel compact hero-panel-slim">
          <span className="eyebrow">불러오기 실패</span>
          <h1 className="page-title page-title-medium">관리자 목록을 가져오지 못했습니다</h1>
          <p className="page-copy compact-copy">{error}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack console-shell">
      <section className="console-hero">
        <div className="console-hero-copy">
          <span className="eyebrow">CONTROL ROOM</span>
          <h1 className="console-hero-title">접수 검토, 공개 승인, 메모 관리까지 한 화면에서</h1>
          <p className="console-hero-description">
            {session.user?.name} 관리자 계정으로 로그인되어 있습니다. 접수 상태를 바꾸고, 사진을 확인하고, 공개 여부를 결정하는 모든
            흐름을 이 화면에서 처리할 수 있습니다.
          </p>
          <div className="button-row">
            <Link to="/" className="button button-secondary">
              공개 홈 보기
            </Link>
            <LogoutButton action="/api/admin/logout" redirectTo="/" className="button button-primary" label="관리자 로그아웃" />
          </div>
        </div>
      </section>

      <section className="console-overview-grid">
        <article className="console-overview-card">
          <span>전체 접수</span>
          <strong>{leads.length}</strong>
        </article>
        <article className="console-overview-card">
          <span>현재 공개</span>
          <strong>{publishedCount}</strong>
        </article>
        <article className="console-overview-card">
          <span>위치 검증 완료</span>
          <strong>{locationVerifiedCount}</strong>
        </article>
      </section>

      <section className="filter-panel console-tab-row">
        <Link to="/admin/leads" className={`filter-chip link${!statusFilter ? " active" : ""}`}>
          전체
        </Link>
        {leadStatusOptions.map((option) => (
          <Link
            key={option.value}
            to={`/admin/leads?status=${option.value}`}
            className={`filter-chip link${statusFilter === option.value ? " active" : ""}`}
          >
            {option.label}
          </Link>
        ))}
      </section>

      <AdminLeadManager leads={leads} />
    </div>
  );
}
