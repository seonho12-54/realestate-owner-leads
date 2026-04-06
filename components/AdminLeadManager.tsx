"use client";

import Link from "next/link";
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
  const visiblePhotos = lead.photos.filter((photo) => Boolean(photo.viewUrl));
  const coverPhoto = visiblePhotos[0];

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

      setMessage("변경이 저장되었습니다.");
      window.location.reload();
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : "저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <article className="admin-lead-card compact">
      <div className="admin-lead-media compact">
        {coverPhoto?.viewUrl ? (
          <img src={coverPhoto.viewUrl} alt={lead.listingTitle} className="admin-lead-thumb compact" />
        ) : (
          <div className="admin-lead-thumb empty compact">
            {lead.photoCount > 0 ? "S3 미리보기 확인 필요" : "사진 없음"}
          </div>
        )}
        <div className="admin-badges">
          <span className={`status-pill ${lead.isPublished ? "published" : "draft"}`}>{lead.isPublished ? "공개 중" : "비공개"}</span>
          <span className="status-pill neutral">{formatDateTime(lead.createdAt)}</span>
        </div>
      </div>

      <div className="admin-lead-body compact">
        <div className="admin-lead-head compact">
          <div>
            <h2>{lead.listingTitle}</h2>
            <p>
              {lead.officeName} · {lead.region2DepthName ?? "허용 지역"} {lead.region3DepthName ?? ""}
            </p>
          </div>
          <strong className="admin-price-tag">{formatTradeLabel(lead)}</strong>
        </div>

        <div className="admin-meta-grid compact">
          <span>{getPropertyTypeLabel(lead.propertyType)}</span>
          <span>{formatArea(lead.areaM2)}</span>
          <span>{lead.addressLine1}</span>
          <span>등록 회원: {lead.userName ?? "게스트 없음"}</span>
          <span>
            접수자: {lead.ownerName} / {lead.phone}
          </span>
          <span>사진 {lead.photoCount}장</span>
        </div>

        {visiblePhotos.length > 1 ? (
          <div className="admin-photo-strip compact">
            {visiblePhotos.slice(1, 5).map((photo) =>
              photo.viewUrl ? <img key={photo.id} src={photo.viewUrl} alt={photo.fileName} className="admin-photo-mini" /> : null,
            )}
          </div>
        ) : null}

        {lead.photoCount > 0 && visiblePhotos.length === 0 ? (
          <div className="inline-diagnostic">
            사진은 접수됐지만 미리보기를 만들지 못했습니다. S3 버킷, IAM 권한, presigned GET URL 생성을 확인해 주세요.
          </div>
        ) : null}

        <div className="admin-control-grid compact">
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
            placeholder="노출 여부, 보완 요청 사항, 확인 메모 등을 적어 주세요"
          />
        </label>

        <div className="admin-footer compact">
          <div className="admin-footnotes compact">
            <span>UTM: {[lead.utmSource, lead.utmMedium, lead.utmCampaign].filter(Boolean).join(" / ") || "-"}</span>
            <span>위치 검증: {lead.locationVerified ? "완료" : "미완료"}</span>
          </div>
          <div className="button-row">
            {lead.isPublished ? (
              <Link href={`/listings/${lead.id}`} className="button button-secondary button-small">
                공개 상세 보기
              </Link>
            ) : null}
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
