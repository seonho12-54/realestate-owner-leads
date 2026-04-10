import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";

import { AdminLeadManager } from "@/components/AdminLeadManager";
import { useSession } from "@/context/SessionContext";
import { listAdminLeads, type AdminLeadSummary } from "@/lib/leads";
import { listActiveOffices, type OfficeOption } from "@/lib/offices";

export function AdminLeadsPage() {
  const { session } = useSession();
  const [leads, setLeads] = useState<AdminLeadSummary[]>([]);
  const [offices, setOffices] = useState<OfficeOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (session.kind !== "admin") {
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    Promise.all([listAdminLeads(), listActiveOffices()])
      .then(([leadResponse, officeResponse]) => {
        if (!isMounted) {
          return;
        }

        setLeads(leadResponse);
        setOffices(officeResponse);
        setError(null);
      })
      .catch((loadError) => {
        if (!isMounted) {
          return;
        }

        setLeads([]);
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
  }, [session.kind]);

  const publishedCount = useMemo(() => leads.filter((lead) => lead.isPublished).length, [leads]);
  const reviewCount = useMemo(() => leads.filter((lead) => lead.status === "reviewing").length, [leads]);
  const pendingCount = useMemo(() => leads.filter((lead) => lead.status === "new").length, [leads]);

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
        <h1 className="page-title page-title-medium">등록 매물 관리</h1>
        <div className="stat-row">
          <div className="stat-pill">전체 {leads.length}건</div>
          <div className="stat-pill">신규 접수 {pendingCount}건</div>
          <div className="stat-pill">검토 중 {reviewCount}건</div>
          <div className="stat-pill">공개 중 {publishedCount}건</div>
        </div>
      </section>

      <AdminLeadManager leads={leads} offices={offices} />
    </div>
  );
}
