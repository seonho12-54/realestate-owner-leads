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
  const pendingCount = useMemo(() => leads.filter((lead) => !lead.isPublished).length, [leads]);

  if (!session.isLoading && session.kind !== "admin") {
    return <Navigate to="/admin/login" replace />;
  }

  if (isLoading) {
    return (
      <div className="page-stack">
        <section className="stitch-data-panel">
          <div className="stitch-panel-header">
            <div>
              <span className="stitch-panel-kicker">Admin Dashboard</span>
              <h2>관리 콘솔을 준비하고 있습니다.</h2>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-stack">
        <section className="stitch-data-panel">
          <div className="stitch-panel-header">
            <div>
              <span className="stitch-panel-kicker">Load Failed</span>
              <h2>관리자 목록을 가져오지 못했습니다.</h2>
            </div>
            <p>{error}</p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="console-shell">
      <section className="stitch-data-panel">
        <div className="stitch-panel-header">
          <div>
            <span className="stitch-panel-kicker">Control Room</span>
            <h2>접수 검토, 공개 전환, 관리자 메모를 한 화면에서 처리합니다.</h2>
          </div>
          <div className="button-row">
            <Link to="/" className="button button-secondary button-small">
              공개 홈 보기
            </Link>
            <LogoutButton action="/api/admin/logout" redirectTo="/" className="button button-primary button-small" label="관리자 로그아웃" />
          </div>
        </div>
      </section>

      <section className="stitch-metrics-grid admin">
        <article className="stitch-metric-card">
          <span>TOTAL LEADS</span>
          <strong>{leads.length.toLocaleString("ko-KR")}</strong>
          <p>전체 접수 건수</p>
        </article>
        <article className="stitch-metric-card emphasis">
          <span>PUBLISHED</span>
          <strong>{publishedCount.toLocaleString("ko-KR")}</strong>
          <p>현재 공개 중인 매물</p>
        </article>
        <article className="stitch-metric-card">
          <span>PENDING REVIEW</span>
          <strong>{pendingCount.toLocaleString("ko-KR")}</strong>
          <p>검토가 남은 접수</p>
        </article>
        <article className="stitch-metric-card">
          <span>LOCATION VERIFIED</span>
          <strong>{locationVerifiedCount.toLocaleString("ko-KR")}</strong>
          <p>위치 검증이 끝난 접수</p>
        </article>
      </section>

      <section className="stitch-data-panel">
        <div className="stitch-panel-toolbar">
          <div className="stitch-toolbar-tabs">
            <Link to="/admin/leads" className={`stitch-toolbar-tab${!statusFilter ? " active" : ""}`}>
              전체
            </Link>
            {leadStatusOptions.map((option) => (
              <Link
                key={option.value}
                to={`/admin/leads?status=${option.value}`}
                className={`stitch-toolbar-tab${statusFilter === option.value ? " active" : ""}`}
              >
                {option.label}
              </Link>
            ))}
          </div>
          <p className="stitch-toolbar-note">관리자만 공개 전환과 상태 변경을 할 수 있습니다.</p>
        </div>

        <AdminLeadManager leads={leads} />
      </section>
    </div>
  );
}
