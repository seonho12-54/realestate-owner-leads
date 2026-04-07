"use client";

import { useEffect, useMemo, useState } from "react";

import { Link } from "@/components/RouterLink";
import { apiFetch } from "@/lib/api";
import { formatArea, formatDateTime, formatTradeLabel, getPropertyTypeLabel } from "@/lib/format";
import type { AdminLeadSummary } from "@/lib/leads";
import type { LeadStatus } from "@/lib/validation";
import { leadStatusOptions } from "@/lib/validation";

function getStatusLabel(status: LeadStatus) {
  return leadStatusOptions.find((option) => option.value === status)?.label ?? status;
}

function LeadDetailPanel({ lead }: { lead: AdminLeadSummary }) {
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [isPublished, setIsPublished] = useState(lead.isPublished);
  const [adminMemo, setAdminMemo] = useState(lead.adminMemo ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const visiblePhotos = lead.photos.filter((photo) => Boolean(photo.viewUrl));
  const coverPhoto = visiblePhotos[0];

  useEffect(() => {
    setStatus(lead.status);
    setIsPublished(lead.isPublished);
    setAdminMemo(lead.adminMemo ?? "");
    setMessage(null);
  }, [lead]);

  async function handleSave() {
    setMessage(null);

    try {
      setIsSaving(true);
      const response = await apiFetch(`/api/admin/leads/${lead.id}`, {
        method: "PATCH",
        json: {
          status,
          isPublished,
          adminMemo,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "변경 사항을 저장하지 못했습니다.");
      }

      setMessage("변경 사항을 저장했습니다.");
      window.location.reload();
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : "변경 사항 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <aside className="stitch-detail-panel">
      <div className="stitch-panel-header compact">
        <div>
          <span className="stitch-panel-kicker">Selected Lead</span>
          <h2>{lead.listingTitle}</h2>
        </div>
        <span className={`stitch-status-chip ${lead.transactionType}`}>{formatTradeLabel(lead)}</span>
      </div>

      {coverPhoto?.viewUrl ? (
        <img src={coverPhoto.viewUrl} alt={lead.listingTitle} className="stitch-selected-image" />
      ) : (
        <div className="stitch-image-fallback">{lead.photoCount > 0 ? "S3 PREVIEW" : "NO PHOTO"}</div>
      )}

      <div className="stitch-detail-facts">
        <span>{getPropertyTypeLabel(lead.propertyType)}</span>
        <span>{formatArea(lead.areaM2)}</span>
        <span>{lead.region2DepthName ?? "허용 지역"} {lead.region3DepthName ?? ""}</span>
      </div>

      <div className="stitch-detail-meta">
        <div>
          <strong>접수자</strong>
          <span>{lead.ownerName} / {lead.phone}</span>
        </div>
        <div>
          <strong>회원 계정</strong>
          <span>{lead.userEmail ?? "비회원 접수"}</span>
        </div>
        <div>
          <strong>현재 상태</strong>
          <span>{getStatusLabel(lead.status)}</span>
        </div>
        <div>
          <strong>접수 시점</strong>
          <span>{formatDateTime(lead.createdAt)}</span>
        </div>
      </div>

      <label className="field">
        <span>접수 상태</span>
        <select className="input" value={status} onChange={(event) => setStatus(event.target.value as LeadStatus)}>
          {leadStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="toggle-field">
        <span>공개 게시</span>
        <input type="checkbox" checked={isPublished} onChange={(event) => setIsPublished(event.target.checked)} />
      </label>

      <label className="field">
        <span>관리자 메모</span>
        <textarea
          className="textarea"
          value={adminMemo}
          onChange={(event) => setAdminMemo(event.target.value)}
          placeholder="보완 요청, 공개 여부 판단 근거, 후속 메모를 기록하세요."
        />
      </label>

      <div className="stitch-detail-footer">
        <div className="stitch-detail-notes">
          <span>위치 검증 {lead.locationVerified ? "완료" : "미완료"}</span>
          <span>사진 수 {lead.photoCount}장</span>
          <span>UTM: {[lead.utmSource, lead.utmMedium, lead.utmCampaign].filter(Boolean).join(" / ") || "-"}</span>
        </div>
        <div className="button-row">
          {lead.isPublished ? (
            <Link href={`/listings/${lead.id}`} className="button button-secondary button-small">
              공개 상세 보기
            </Link>
          ) : null}
          <button type="button" className="button button-primary button-small" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "저장 중..." : "변경 저장"}
          </button>
        </div>
        {message ? <div className="muted-row">{message}</div> : null}
      </div>
    </aside>
  );
}

export function AdminLeadManager({ leads }: { leads: AdminLeadSummary[] }) {
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(leads[0]?.id ?? null);

  useEffect(() => {
    if (leads.length === 0) {
      setSelectedLeadId(null);
      return;
    }

    if (!leads.some((lead) => lead.id === selectedLeadId)) {
      setSelectedLeadId(leads[0]?.id ?? null);
    }
  }, [leads, selectedLeadId]);

  const selectedLead = useMemo(() => leads.find((lead) => lead.id === selectedLeadId) ?? leads[0] ?? null, [leads, selectedLeadId]);

  if (leads.length === 0) {
    return (
      <div className="stitch-empty-state">
        <strong>접수된 매물이 없습니다.</strong>
        <p>새 접수가 들어오면 여기에서 검토 상태와 공개 여부를 관리하게 됩니다.</p>
      </div>
    );
  }

  return (
    <div className="stitch-admin-grid">
      <section className="stitch-data-panel">
        <div className="stitch-panel-header compact">
          <div>
            <span className="stitch-panel-kicker">Lead Ledger</span>
            <h2>접수 목록</h2>
          </div>
          <p>{leads.length.toLocaleString("ko-KR")}건의 접수</p>
        </div>

        <div className="stitch-table-shell admin">
          <div className="stitch-table-head admin">
            <span>Owner</span>
            <span>Property Address</span>
            <span>Estimated Value</span>
            <span>Status</span>
            <span>Date Added</span>
          </div>

          {leads.map((lead) => (
            <button
              key={lead.id}
              type="button"
              className={`stitch-table-row admin${selectedLeadId === lead.id ? " active" : ""}`}
              onClick={() => setSelectedLeadId(lead.id)}
            >
              <span className="stitch-lead-cell stitch-lead-title">
                <span className="stitch-avatar">{lead.ownerName.slice(0, 2).toUpperCase()}</span>
                <span>
                  <strong>{lead.ownerName}</strong>
                  <small>{lead.userName ?? "비회원 접수"}</small>
                </span>
              </span>
              <span className="stitch-lead-address">{lead.addressLine1}</span>
              <span className="stitch-lead-value">{formatTradeLabel(lead)}</span>
              <span className={`stitch-status-chip ${lead.isPublished ? lead.transactionType : "draft"}`}>
                {lead.isPublished ? getStatusLabel(lead.status) : "검토 중"}
              </span>
              <span className="stitch-lead-date">{formatDateTime(lead.createdAt)}</span>
            </button>
          ))}
        </div>
      </section>

      {selectedLead ? <LeadDetailPanel lead={selectedLead} /> : null}
    </div>
  );
}
