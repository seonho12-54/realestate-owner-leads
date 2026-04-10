import { useEffect, useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";

import { AdminLeadManager } from "@/components/AdminLeadManager";
import { Link } from "@/components/RouterLink";
import { useSession } from "@/context/SessionContext";
import { adminLeadFilters, getAdminLeadFilterMeta, getAdminLeadsPath, isLeadStatusFilter } from "@/lib/admin-lead-status";
import { listAdminLeads, type AdminLeadSummary } from "@/lib/leads";
import { listActiveOffices, type OfficeOption } from "@/lib/offices";
import type { LeadStatus } from "@/lib/validation";

function countByStatus(leads: AdminLeadSummary[], status: LeadStatus) {
  return leads.filter((lead) => lead.status === status).length;
}

export function AdminLeadsPage() {
  const { session } = useSession();
  const { statusFilter: statusFilterParam } = useParams();
  const [leads, setLeads] = useState<AdminLeadSummary[]>([]);
  const [allLeads, setAllLeads] = useState<AdminLeadSummary[]>([]);
  const [offices, setOffices] = useState<OfficeOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const statusFilter = statusFilterParam == null ? null : isLeadStatusFilter(statusFilterParam) ? statusFilterParam : "invalid";

  useEffect(() => {
    if (session.kind !== "admin" || statusFilter === "invalid") {
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const filteredLeadsRequest = listAdminLeads(statusFilter);
    const allLeadsRequest = statusFilter ? listAdminLeads() : filteredLeadsRequest;

    Promise.all([filteredLeadsRequest, listActiveOffices(), allLeadsRequest])
      .then(([leadResponse, officeResponse, allLeadResponse]) => {
        if (!isMounted) {
          return;
        }

        setLeads(leadResponse);
        setAllLeads(allLeadResponse);
        setOffices(officeResponse);
        setError(null);
      })
      .catch((loadError) => {
        if (!isMounted) {
          return;
        }

        setLeads([]);
        setAllLeads([]);
        setOffices([]);
        setError(loadError instanceof Error ? loadError.message : "관리 목록을 불러오지 못했습니다.");
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

  const filterMeta = useMemo(
    () => (statusFilter === "invalid" ? getAdminLeadFilterMeta(null) : getAdminLeadFilterMeta(statusFilter)),
    [statusFilter],
  );
  const publishedCount = useMemo(() => allLeads.filter((lead) => lead.isPublished).length, [allLeads]);
  const newCount = useMemo(() => countByStatus(allLeads, "new"), [allLeads]);
  const reviewingCount = useMemo(() => countByStatus(allLeads, "reviewing"), [allLeads]);
  const completedCount = useMemo(() => countByStatus(allLeads, "completed"), [allLeads]);

  if (statusFilter === "invalid") {
    return <Navigate to="/admin/leads" replace />;
  }

  if (!session.isLoading && session.kind !== "admin") {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <div className="page-stack">
        <section className="page-panel">
          <span className="eyebrow">관리자 모드</span>
          <h1 className="page-title page-title-medium">관리자 화면을 준비하고 있습니다.</h1>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-stack">
        <section className="page-panel">
          <span className="eyebrow">불러오기 실패</span>
          <h1 className="page-title page-title-medium">관리 목록을 가져오지 못했습니다.</h1>
          <p className="page-copy compact-copy">{error}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="page-panel hero-panel-slim">
        <span className="eyebrow">관리자 모드</span>
        <h1 className="page-title page-title-medium">{filterMeta.label} 매물 관리</h1>
        <p className="page-copy compact-copy">{filterMeta.description}</p>
        <div className="stat-row">
          <div className="stat-pill">전체 {allLeads.length}건</div>
          <div className="stat-pill">신규접수 {newCount}건</div>
          <div className="stat-pill">검토중 {reviewingCount}건</div>
          <div className="stat-pill">처리완료 {completedCount}건</div>
          <div className="stat-pill">공개 중 {publishedCount}건</div>
        </div>
        <div className="button-row">
          {adminLeadFilters.map((filter) => {
            const isActive = filter.value === statusFilter;
            return (
              <Link
                key={filter.label}
                href={getAdminLeadsPath(filter.value)}
                className={`button button-small ${isActive ? "button-primary" : "button-secondary"}`}
              >
                {filter.label}
              </Link>
            );
          })}
        </div>
      </section>

      <AdminLeadManager leads={leads} offices={offices} activeStatus={statusFilter} />
    </div>
  );
}
