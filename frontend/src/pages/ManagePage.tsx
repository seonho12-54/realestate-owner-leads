import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";

import { Link } from "@/components/RouterLink";
import { useSession } from "@/context/SessionContext";
import { formatArea, formatDateTime, formatTradeLabel, getPropertyTypeLabel } from "@/lib/format";
import { listMyLeads, type MyLeadSummary } from "@/lib/leads";
import { leadStatusOptions, type LeadStatus } from "@/lib/validation";

function getStatusColor(status: LeadStatus, isPublished: boolean) {
  if (isPublished) return { bg: "var(--success-soft)", color: "var(--success-strong)" };
  if (status === "reviewing") return { bg: "var(--warning-soft)", color: "var(--warning-strong)" };
  if (status === "closed") return { bg: "var(--danger-soft)", color: "var(--danger-strong)" };
  return { bg: "rgba(26,58,110,0.08)", color: "var(--primary)" };
}

export function ManagePage() {
  const { session } = useSession();
  const [myLeads, setMyLeads] = useState<MyLeadSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");

  useEffect(() => {
    if (session.kind !== "user") {
      setMyLeads([]);
      setError(null);
      return;
    }

    let isMounted = true;

    listMyLeads()
      .then((response) => {
        if (!isMounted) {
          return;
        }

        setMyLeads(response);
        setError(null);
      })
      .catch((loadError) => {
        if (!isMounted) {
          return;
        }

        setMyLeads([]);
        setError(loadError instanceof Error ? loadError.message : "매물 관리 목록을 불러오지 못했어요.");
      });

    return () => {
      isMounted = false;
    };
  }, [session.kind]);

  const publishedCount = useMemo(() => myLeads.filter((lead) => lead.isPublished).length, [myLeads]);
  const reviewingCount = useMemo(() => myLeads.filter((lead) => lead.status === "reviewing").length, [myLeads]);
  const filteredLeads = useMemo(() => {
    if (statusFilter === "all") {
      return myLeads;
    }

    return myLeads.filter((lead) => lead.status === statusFilter);
  }, [myLeads, statusFilter]);

  function getStatusLabel(status: LeadStatus) {
    return leadStatusOptions.find((option) => option.value === status)?.label ?? status;
  }

  if (!session.isLoading && session.kind === "admin") {
    return <Navigate to="/admin/leads" replace />;
  }

  if (!session.authenticated) {
    return (
      <div className="page-stack">
        <section className="locked-state-card">
          <span className="eyebrow">🗂 내 매물 관리</span>
          <h1 className="page-title page-title-medium">로그인 후 내 매물을 관리할 수 있어요</h1>
          <p className="page-copy">일반 사용자는 내가 등록한 매물을 확인하고, 새 매물 등록 화면으로 바로 이동할 수 있어요.</p>
          <div className="button-row" style={{ marginTop: 4 }}>
            <Link href="/login?next=/manage" className="button button-primary">
              로그인
            </Link>
            <Link href="/signup?next=/manage" className="button button-secondary">
              회원가입
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      {/* Hero */}
      <section className="hero-card">
        <div>
          <span className="eyebrow">🗂 내 매물 관리</span>
          <h1 className="page-title page-title-medium">등록한 매물과 진행 상태를 한눈에 확인하세요</h1>
          <p className="page-copy">공개 여부와 심사 상태를 여기에서 바로 확인할 수 있어요.</p>
          <div className="button-row" style={{ marginTop: 8 }}>
            <Link href="/sell/register" className="button button-primary">
              ✏️ 문의하기
            </Link>
            <Link href="/me" className="button button-secondary">
              설정으로 이동
            </Link>
          </div>
        </div>
        <div className="hero-region-card">
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--muted)" }}>매물 현황</span>
          <strong style={{ color: "var(--primary)", fontSize: "2rem", fontFamily: "var(--font-heading)", letterSpacing: "-0.06em" }}>
            {myLeads.length}
          </strong>
          <p>전체 등록 매물</p>
        </div>
      </section>

      {/* Summary stats */}
      <section className="manage-summary-grid">
        <article className="manage-summary-card">
          <span className="eyebrow" style={{ width: "fit-content" }}>전체 매물</span>
          <strong>{myLeads.length}</strong>
          <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>현재 계정으로 등록한 매물 수예요.</p>
        </article>
        <article className="manage-summary-card" style={{ borderTop: "3px solid var(--success)" }}>
          <span className="eyebrow" style={{ width: "fit-content", background: "var(--success-soft)", color: "var(--success-strong)" }}>공개 중</span>
          <strong style={{ color: "var(--success-strong)" }}>{publishedCount}</strong>
          <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>둘러보기에 노출 중인 매물이에요.</p>
        </article>
        <article className="manage-summary-card" style={{ borderTop: "3px solid var(--warning)" }}>
          <span className="eyebrow" style={{ width: "fit-content", background: "var(--warning-soft)", color: "var(--warning-strong)" }}>검토 중</span>
          <strong style={{ color: "var(--warning-strong)" }}>{reviewingCount}</strong>
          <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>관리자 확인을 기다리는 매물이에요.</p>
        </article>
      </section>

      {error ? (
        <section className="page-panel">
          <span className="eyebrow">불러오기 실패</span>
          <h2 className="section-title">매물 관리 목록을 불러오지 못했어요</h2>
          <p className="page-copy compact-copy">{error}</p>
        </section>
      ) : null}

      {/* Listing list with filters */}
      <section className="saved-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">내 매물</span>
            <h2 className="section-title">등록한 매물 목록</h2>
          </div>
          <div className="chip-group">
            <button
              type="button"
              className={`chip${statusFilter === "all" ? " active" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              전체
            </button>
            {leadStatusOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`chip${statusFilter === option.value ? " active" : ""}`}
                onClick={() => setStatusFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {filteredLeads.length === 0 ? (
          <div className="empty-panel">
            <strong>🏠 조건에 맞는 매물이 없어요</strong>
            <p>{myLeads.length === 0 ? "내 동네 인증 후 첫 매물을 등록해 보세요." : "다른 상태 필터를 선택해 보세요."}</p>
          </div>
        ) : (
          <div className="saved-card-grid">
            {filteredLeads.map((lead) => {
              const statusStyle = getStatusColor(lead.status, lead.isPublished);
              const cardContent = (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <strong style={{ flex: 1 }}>{lead.listingTitle}</strong>
                    <span
                      style={{
                        flexShrink: 0,
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: statusStyle.bg,
                        color: statusStyle.color,
                        fontSize: "0.76rem",
                        fontWeight: 800,
                      }}
                    >
                      {lead.isPublished ? "공개 중" : getStatusLabel(lead.status)}
                    </span>
                  </div>
                  <span style={{ fontWeight: 800, color: "var(--primary)", fontSize: "1rem" }}>{formatTradeLabel(lead)}</span>
                  <span>{getPropertyTypeLabel(lead.propertyType)} · {formatArea(lead.areaM2)}</span>
                  <span>📍 {lead.region3DepthName ?? "인증 지역"}</span>
                  <span style={{ fontSize: "0.8rem", color: "var(--muted-light)" }}>
                    등록일 {formatDateTime(lead.createdAt)}
                  </span>
                  {!lead.isPublished ? <span className="saved-card-note">공개 전이라 상세 화면은 열리지 않아요.</span> : null}
                </>
              );

              return (
                lead.isPublished ? (
                  <Link key={lead.id} href={`/listings/${lead.id}`} className="saved-card">
                    {cardContent}
                  </Link>
                ) : (
                  <div key={lead.id} className="saved-card saved-card-disabled">
                    {cardContent}
                  </div>
                )
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
