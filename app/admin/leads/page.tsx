import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { LeadStatusSelect } from "@/components/LeadStatusSelect";
import { requireAdminSession } from "@/lib/auth";
import { formatArea, formatDateTime, formatKrw } from "@/lib/format";
import { listLeads } from "@/lib/leads";
import { leadStatusOptions } from "@/lib/validation";

export const dynamic = "force-dynamic";

const statusLabelMap = Object.fromEntries(leadStatusOptions.map((option) => [option.value, option.label]));

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams?: {
    status?: string;
  };
}) {
  noStore();

  const session = requireAdminSession();
  const statusFilter = leadStatusOptions.some((option) => option.value === searchParams?.status)
    ? (searchParams?.status as (typeof leadStatusOptions)[number]["value"])
    : null;

  const leads = await listLeads(statusFilter);

  const counts = leadStatusOptions.reduce<Record<string, number>>((accumulator, option) => {
    accumulator[option.value] = leads.filter((lead) => lead.status === option.value).length;
    return accumulator;
  }, {});

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div className="admin-toolbar">
          <div>
            <span className="eyebrow">관리자 대시보드</span>
            <h1 className="hero-title" style={{ maxWidth: 720 }}>
              접수 목록과 상태 변경
            </h1>
            <p className="hero-copy">
              {session.name}님으로 로그인되었습니다. 신규 접수, 연락 완료, 검토 중 등 상태를 바로 변경할 수 있습니다.
            </p>
          </div>
          <form action="/api/admin/logout" method="post">
            <button className="btn-secondary" type="submit">
              로그아웃
            </button>
          </form>
        </div>
      </section>

      <section className="section-card">
        <div className="admin-summary-grid">
          <div className="summary-pill">
            <strong>{leads.length}</strong>
            <span>현재 목록</span>
          </div>
          {leadStatusOptions.map((option) => (
            <div className="summary-pill" key={option.value}>
              <strong>{counts[option.value] ?? 0}</strong>
              <span>{option.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section-card">
        <div className="admin-toolbar">
          <div>
            <h2 className="section-title">상태 필터</h2>
            <p className="section-copy">필터를 바꾸면 현재 접수 상태별로 목록을 좁혀 볼 수 있습니다.</p>
          </div>
          <div className="filter-row">
            <Link href="/admin/leads" className={`tab-link${!statusFilter ? " is-active" : ""}`}>
              전체
            </Link>
            {leadStatusOptions.map((option) => (
              <Link
                key={option.value}
                href={`/admin/leads?status=${option.value}`}
                className={`tab-link${statusFilter === option.value ? " is-active" : ""}`}
              >
                {option.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {leads.length === 0 ? (
        <div className="empty-card">
          <h2 className="section-title">표시할 접수가 없습니다</h2>
          <p className="section-copy">아직 등록된 매물이 없거나 현재 필터에 해당하는 접수 건이 없습니다.</p>
        </div>
      ) : (
        <section className="lead-list">
          {leads.map((lead) => (
            <article className="lead-card" key={lead.id}>
              <div className="top-line">
                <div>
                  <div className="lead-meta">
                    <span>#{lead.id}</span>
                    <span>{lead.officeName}</span>
                    <span>{formatDateTime(lead.createdAt)}</span>
                  </div>
                  <h2 className="lead-title">
                    {lead.ownerName} · {statusLabelMap[lead.status]}
                  </h2>
                </div>
                <span className="status-badge" data-status={lead.status}>
                  {statusLabelMap[lead.status]}
                </span>
              </div>

              <div className="lead-actions">
                <div className="lead-meta">
                  <span>{lead.phone}</span>
                  <span>{lead.email ?? "이메일 없음"}</span>
                  <span>{lead.photoCount}장 첨부</span>
                </div>
                <LeadStatusSelect leadId={lead.id} currentStatus={lead.status} />
              </div>

              <div className="detail-block">
                <div className="detail-grid">
                  <div className="detail-item">
                    <strong>매물 분류</strong>
                    <span>
                      {lead.propertyType} / {lead.transactionType}
                    </span>
                  </div>
                  <div className="detail-item">
                    <strong>주소</strong>
                    <span>
                      {lead.addressLine1}
                      {lead.addressLine2 ? ` ${lead.addressLine2}` : ""}
                    </span>
                  </div>
                  <div className="detail-item">
                    <strong>면적</strong>
                    <span>{formatArea(lead.areaM2)}</span>
                  </div>
                  <div className="detail-item">
                    <strong>희망 매매가</strong>
                    <span>{formatKrw(lead.priceKrw)}</span>
                  </div>
                  <div className="detail-item">
                    <strong>보증금 / 전세금</strong>
                    <span>{formatKrw(lead.depositKrw)}</span>
                  </div>
                  <div className="detail-item">
                    <strong>월세</strong>
                    <span>{formatKrw(lead.monthlyRentKrw)}</span>
                  </div>
                </div>
              </div>

              <div className="detail-block">
                <div className="detail-grid">
                  <div className="detail-item">
                    <strong>연락 가능 시간</strong>
                    <span>{lead.contactTime ?? "-"}</span>
                  </div>
                  <div className="detail-item">
                    <strong>UTM</strong>
                    <span>{[lead.utmSource, lead.utmMedium, lead.utmCampaign].filter(Boolean).join(" / ") || "-"}</span>
                  </div>
                  <div className="detail-item">
                    <strong>유입 referrer</strong>
                    <span>{lead.referrerUrl ?? "-"}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <strong>설명</strong>
                  <span>{lead.description ?? "추가 설명 없음"}</span>
                </div>
                <div className="detail-item">
                  <strong>Landing URL</strong>
                  <span>{lead.landingUrl ?? "-"}</span>
                </div>
                {lead.photoNames.length > 0 ? (
                  <div className="detail-item">
                    <strong>첨부 사진 파일명</strong>
                    <div className="photo-name-list">
                      {lead.photoNames.map((photoName) => (
                        <span className="photo-name" key={`${lead.id}-${photoName}`}>
                          {photoName}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

