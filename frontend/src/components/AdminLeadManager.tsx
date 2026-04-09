import { useEffect, useMemo, useState } from "react";

import { Link } from "@/components/RouterLink";
import { formatArea, formatDateTime, formatTradeLabel, getPropertyTypeLabel } from "@/lib/format";
import type { AdminLeadSummary } from "@/lib/leads";
import { updateLeadAdminFields } from "@/lib/leads";
import type { LeadStatus } from "@/lib/validation";
import { leadStatusOptions } from "@/lib/validation";

function getStatusLabel(status: LeadStatus) {
  return leadStatusOptions.find((option) => option.value === status)?.label ?? status;
}

export function AdminLeadManager({ leads }: { leads: AdminLeadSummary[] }) {
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(leads[0]?.id ?? null);
  const [status, setStatus] = useState<LeadStatus>(leads[0]?.status ?? "new");
  const [isPublished, setIsPublished] = useState(leads[0]?.isPublished ?? false);
  const [adminMemo, setAdminMemo] = useState(leads[0]?.adminMemo ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const selectedLead = useMemo(() => leads.find((lead) => lead.id === selectedLeadId) ?? leads[0] ?? null, [leads, selectedLeadId]);

  useEffect(() => {
    if (!selectedLead) {
      return;
    }

    setStatus(selectedLead.status);
    setIsPublished(selectedLead.isPublished);
    setAdminMemo(selectedLead.adminMemo ?? "");
    setMessage(null);
  }, [selectedLead]);

  async function handleSave() {
    if (!selectedLead) {
      return;
    }

    try {
      setIsSaving(true);
      setMessage(null);

      await updateLeadAdminFields(selectedLead.id, {
        status,
        isPublished,
        adminMemo,
      });

      setMessage("변경 사항이 저장되었습니다. 최신 상태를 다시 반영합니다.");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  if (leads.length === 0) {
    return (
      <div className="empty-panel">
        <strong>접수된 매물이 없습니다.</strong>
        <p>새 접수가 들어오면 이 화면에서 상태 변경과 공개 여부를 관리할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="admin-grid">
      <section className="page-panel admin-list-panel">
        <div className="admin-list">
          {leads.map((lead) => (
            <button
              key={lead.id}
              type="button"
              className={`admin-lead-card${selectedLeadId === lead.id ? " active" : ""}`}
              onClick={() => setSelectedLeadId(lead.id)}
            >
              <div className="admin-lead-card-top">
                <div>
                  <strong>{lead.listingTitle}</strong>
                  <span>{lead.ownerName}</span>
                </div>
                <span className={`status-badge transaction-${lead.transactionType}`}>{getStatusLabel(lead.status)}</span>
              </div>

              <div className="admin-lead-card-meta">
                <span>{lead.region3DepthName || lead.addressLine1}</span>
                <span>{formatTradeLabel(lead)}</span>
                <span>{formatDateTime(lead.createdAt)}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {selectedLead ? (
        <section className="page-panel admin-detail-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">관리자 검토</span>
              <h2 className="section-title">{selectedLead.listingTitle}</h2>
            </div>

            {selectedLead.isPublished ? (
              <Link href={`/listings/${selectedLead.id}`} className="button button-secondary button-small">
                공개 상세 보기
              </Link>
            ) : null}
          </div>

          <div className="detail-info-grid">
            <div>
              <span>집주인</span>
              <strong>{selectedLead.ownerName}</strong>
            </div>
            <div>
              <span>연락처</span>
              <strong>{selectedLead.phone}</strong>
            </div>
            <div>
              <span>회원 계정</span>
              <strong>{selectedLead.userEmail ?? "비회원 접수"}</strong>
            </div>
            <div>
              <span>매물 유형</span>
              <strong>{getPropertyTypeLabel(selectedLead.propertyType)}</strong>
            </div>
            <div>
              <span>거래 정보</span>
              <strong>{formatTradeLabel(selectedLead)}</strong>
            </div>
            <div>
              <span>면적</span>
              <strong>{formatArea(selectedLead.areaM2)}</strong>
            </div>
            <div>
              <span>주소</span>
              <strong>{selectedLead.addressLine1}</strong>
            </div>
            <div>
              <span>사진</span>
              <strong>{selectedLead.photoCount}장</strong>
            </div>
          </div>

          <div className="form-grid two-column">
            <label className="field">
              <span>상태</span>
              <select className="input" value={status} onChange={(event) => setStatus(event.target.value as LeadStatus)}>
                {leadStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="check-item check-item-inline">
              <input type="checkbox" checked={isPublished} onChange={(event) => setIsPublished(event.target.checked)} />
              <span>공개 게시</span>
            </label>
          </div>

          <label className="field">
            <span>관리자 메모</span>
            <textarea
              className="textarea"
              value={adminMemo}
              onChange={(event) => setAdminMemo(event.target.value)}
              placeholder="보완 요청, 공개 보류 사유, 연락 메모 등을 적어 주세요."
            />
          </label>

          <div className="inline-note-list">
            <span className={`inline-note${selectedLead.locationVerified ? " success" : ""}`}>
              {selectedLead.locationVerified ? "위치 인증 완료" : "위치 인증 미완료"}
            </span>
            <span className="inline-note">{selectedLead.officeName}</span>
          </div>

          {message ? <div className="success-banner">{message}</div> : null}

          <div className="button-row">
            <button type="button" className="button button-primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "저장 중..." : "변경 저장"}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
