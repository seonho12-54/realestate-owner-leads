"use client";

import { useState } from "react";

import { formatArea, formatDateTime, formatTradeLabel, getPropertyTypeLabel } from "@/lib/format";
import type { AdminLeadSummary } from "@/lib/leads";
import type { LeadStatus } from "@/lib/validation";
import { leadStatusOptions } from "@/lib/validation";

function LeadAdminCard({ lead }: { lead: AdminLeadSummary }) {
  const [status, setStatus] = useState(lead.status);
  const [isPublished, setIsPublished] = useState(lead.isPublished);
  const [adminMemo, setAdminMemo] = useState(lead.adminMemo ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setMessage(null);

    try {
      setIsSaving(true);

      const response = await fetch(`/api/admin/leads/${lead.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          isPublished,
          adminMemo,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "저장에 실패했습니다.");
      }

      setMessage("저장되었습니다.");
      window.location.reload();
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : "저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <article className="admin-lead-card">
      <div className="admin-lead-media">
        {lead.photos[0] ? (
          <img src={lead.photos[0].viewUrl} alt={lead.listingTitle} className="admin-lead-thumb" />
        ) : (
          <div className="admin-lead-thumb empty">사진 없음</div>
        )}
        <div className="admin-badges">
          <span className={`status-pill ${lead.isPublished ? "published" : "draft"}`}>{lead.isPublished ? "게시 중" : "비공개"}</span>
          <span className="status-pill neutral">{formatDateTime(lead.createdAt)}</span>
        </div>
      </div>

      <div className="admin-lead-body">
        <div className="admin-lead-head">
          <div>
            <h2>{lead.listingTitle}</h2>
            <p>
              {lead.officeName} · {lead.region2DepthName ?? "중구"} {lead.region3DepthName ?? ""}
            </p>
          </div>
          <strong>{formatTradeLabel(lead)}</strong>
        </div>

        <div className="admin-meta-grid">
          <span>{getPropertyTypeLabel(lead.propertyType)}</span>
          <span>{formatArea(lead.areaM2)}</span>
          <span>{lead.addressLine1}</span>
          <span>등록 회원: {lead.userName ?? "게스트 없음"}</span>
          <span>접수자: {lead.ownerName} / {lead.phone}</span>
          <span>사진 {lead.photoCount}장</span>
        </div>

        {lead.photos.length > 1 ? (
          <div className="admin-photo-strip">
            {lead.photos.slice(1, 6).map((photo) => (
              <img key={photo.id} src={photo.viewUrl} alt={photo.fileName} className="admin-photo-mini" />
            ))}
          </div>
        ) : null}

        <div className="admin-control-grid">
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

          <label className="toggle-field">
            <span>공개 게시</span>
            <input type="checkbox" checked={isPublished} onChange={(event) => setIsPublished(event.target.checked)} />
          </label>
        </div>

        <label className="field">
          <span>관리자 메모</span>
          <textarea
            className="textarea"
            value={adminMemo}
            onChange={(event) => setAdminMemo(event.target.value)}
            placeholder="노출 여부, 보완 요청 사항, 확인 메모 등을 남겨 두세요."
          />
        </label>

        <div className="admin-footer">
          <div className="admin-footnotes">
            <span>UTM: {[lead.utmSource, lead.utmMedium, lead.utmCampaign].filter(Boolean).join(" / ") || "-"}</span>
            <span>위치 검증: {lead.locationVerified ? "완료" : "미완료"}</span>
          </div>
          <div className="button-row">
            {message ? <span className="muted-row">{message}</span> : null}
            <button type="button" className="button button-primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "저장 중..." : "변경 저장"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function AdminLeadManager({ leads }: { leads: AdminLeadSummary[] }) {
  return (
    <div className="admin-lead-list">
      {leads.map((lead) => (
        <LeadAdminCard key={lead.id} lead={lead} />
      ))}
    </div>
  );
}
