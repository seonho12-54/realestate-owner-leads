import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";

import { Link } from "@/components/RouterLink";
import { useSession } from "@/context/SessionContext";
import { formatArea, formatDateTime, formatTradeLabel, getPropertyTypeLabel } from "@/lib/format";
import { listMyLeads, type MyLeadSummary } from "@/lib/leads";
import { leadStatusOptions, type LeadStatus } from "@/lib/validation";

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
          <span className="eyebrow">🛠️ 매물 관리</span>
          <h1 className="page-title page-title-medium">로그인 후 내 매물을 관리할 수 있어요</h1>
          <p className="page-copy">일반 사용자는 내가 등록한 매물을 확인하고, 새 매물 등록 화면으로 바로 이동할 수 있어요.</p>
          <div className="button-row">
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
      <section className="hero-card">
        <div>
          <span className="eyebrow">🛠️ 매물 관리</span>
          <h1 className="page-title page-title-medium">등록한 매물과 진행 상태를 한눈에 확인하세요</h1>
          <p className="page-copy">새 매물 등록은 물론, 공개 여부와 심사 상태도 여기에서 바로 확인할 수 있어요.</p>
        </div>
        <div className="button-row">
          <Link href="/sell" className="button button-primary">
            새 매물 등록
          </Link>
          <Link href="/me" className="button button-secondary">
            지역 설정
          </Link>
        </div>
      </section>

      <section className="manage-summary-grid">
        <article className="manage-summary-card">
          <span className="eyebrow">전체 매물</span>
          <strong>{myLeads.length}</strong>
          <p className="page-copy compact-copy">현재 계정으로 등록한 매물 수예요.</p>
        </article>
        <article className="manage-summary-card">
          <span className="eyebrow">공개 중</span>
          <strong>{publishedCount}</strong>
          <p className="page-copy compact-copy">둘러보기와 홈 미리보기에 노출 중인 매물 수예요.</p>
        </article>
        <article className="manage-summary-card">
          <span className="eyebrow">검토 중</span>
          <strong>{reviewingCount}</strong>
          <p className="page-copy compact-copy">관리자 확인을 기다리는 매물 수예요.</p>
        </article>
      </section>

      {error ? (
        <section className="page-panel">
          <span className="eyebrow">불러오기 실패</span>
          <h2 className="section-title">매물 관리 목록을 불러오지 못했어요</h2>
          <p className="page-copy compact-copy">{error}</p>
        </section>
      ) : null}

      <section className="saved-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">내 매물</span>
            <h2 className="section-title">최근 등록한 매물</h2>
          </div>
          <div className="chip-group">
            <button type="button" className={`chip${statusFilter === "all" ? " active" : ""}`} onClick={() => setStatusFilter("all")}>
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
            {filteredLeads.map((lead) => (
              <Link key={lead.id} href={`/listings/${lead.id}`} className="saved-card">
                <strong>{lead.listingTitle}</strong>
                <span>{formatTradeLabel(lead)}</span>
                <span>
                  {getPropertyTypeLabel(lead.propertyType)} · {formatArea(lead.areaM2)}
                </span>
                <span>{lead.region3DepthName ?? "인증 지역"}</span>
                <span>{lead.isPublished ? "공개 중" : getStatusLabel(lead.status)}</span>
                <span>등록일 {formatDateTime(lead.createdAt)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
