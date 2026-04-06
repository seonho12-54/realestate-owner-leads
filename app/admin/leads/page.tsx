import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { AdminLeadManager } from "@/components/AdminLeadManager";
import { requireAdminSession } from "@/lib/auth";
import { listAdminLeads } from "@/lib/leads";
import { leadStatusOptions } from "@/lib/validation";

export const dynamic = "force-dynamic";

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams?: {
    status?: string;
  };
}) {
  noStore();

  const adminSession = requireAdminSession();
  const statusFilter = leadStatusOptions.some((option) => option.value === searchParams?.status) ? searchParams?.status ?? null : null;
  const leads = await listAdminLeads(statusFilter as any);

  const publishedCount = leads.filter((lead) => lead.isPublished).length;
  const locationVerifiedCount = leads.filter((lead) => lead.locationVerified).length;

  return (
    <div className="page-stack">
      <section className="hero-panel compact">
        <div>
          <span className="eyebrow">관리자 콘솔</span>
          <h1 className="page-title">관리자 전용 매물 관리 화면</h1>
          <p className="page-copy">{adminSession.name} 관리자 계정으로 로그인되어 있습니다. 접수 검토, 공개 전환, 메모 저장을 이 화면에서 처리합니다.</p>
        </div>
        <div className="button-row">
          <Link href="/" className="button button-secondary">
            공개 홈 보기
          </Link>
          <form action="/api/admin/logout" method="post">
            <button type="submit" className="button button-primary">
              관리자 로그아웃
            </button>
          </form>
        </div>
      </section>

      <section className="stats-row">
        <div className="stat-card">
          <strong>{leads.length}</strong>
          <span>전체 접수</span>
        </div>
        <div className="stat-card">
          <strong>{publishedCount}</strong>
          <span>현재 공개</span>
        </div>
        <div className="stat-card">
          <strong>{locationVerifiedCount}</strong>
          <span>위치 검증 완료</span>
        </div>
      </section>

      <section className="filter-panel">
        <div className="filter-group">
          <Link href="/admin/leads" className={`filter-chip link${!statusFilter ? " active" : ""}`}>
            전체
          </Link>
          {leadStatusOptions.map((option) => (
            <Link
              key={option.value}
              href={`/admin/leads?status=${option.value}`}
              className={`filter-chip link${statusFilter === option.value ? " active" : ""}`}
            >
              {option.label}
            </Link>
          ))}
        </div>
      </section>

      <AdminLeadManager leads={leads} />
    </div>
  );
}
