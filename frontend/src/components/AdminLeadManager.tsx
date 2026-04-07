"use client";

import { useState } from "react";

import { Link } from "@/components/RouterLink";
import { apiFetch } from "@/lib/api";
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
        throw new Error(result.error ?? "저장에 실패했습니다.");
      }

      setMessage("변경 사항을 저장했습니다.");
      window.location.reload();
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : "저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <article className="admin-portfolio-card">
      <div className="admin-portfolio-media">
        {coverPhoto?.viewUrl ? (
          <img src={coverPhoto.viewUrl} alt={lead.listingTitle} className="admin-portfolio-cover" />
        ) : (
          <div className="admin-lead-thumb empty compact">{lead.photoCount > 0 ? "S3 미리보기 확인 필요" : "사진 없음"}</div>
        )}
        <div className="admin-badges">
          <span className={`status-pill ${lead.isPublished ? "published" : "draft"}`}>{lead.isPublished ? "공개 중" : "검토 전"}</span>
          <span className="status-pill neutral">{formatDateTime(lead.createdAt)}</span>
        </div>
      </div>

      <div className="admin-portfolio-content">
        <div className="admin-portfolio-top">
          <div>
            <h2>{lead.listingTitle}</h2>
            <p>
              {lead.officeName} · {lead.region2DepthName ?? "허용 지역"} {lead.region3DepthName ?? ""}
            </p>
          </div>
          <strong className="admin-price-tag">{formatTradeLabel(lead)}</strong>
        </div>

        <div className="admin-portfolio-facts">
          <span className="admin-fact-chip">{getPropertyTypeLabel(lead.propertyType)}</span>
          <span className="admin-fact-chip">{formatArea(lead.areaM2)}</span>
          <span className="admin-fact-chip">{lead.addressLine1}</span>
          <span className="admin-fact-chip">사진 {lead.photoCount}장</span>
        </div>

        <div className="admin-portfolio-grid">
          <section className="admin-portfolio-panel">
            <h3>접수 정보</h3>
            <div className="admin-meta-grid">
              <span>등록 회원: {lead.userName ?? "게스트 없음"}</span>
              <span>
                접수자: {lead.ownerName} / {lead.phone}
              </span>
              <span>위치 검증: {lead.locationVerified ? "완료" : "미완료"}</span>
              <span>이메일: {lead.email ?? "-"}</span>
            </div>
          </section>

          <section className="admin-portfolio-panel">
            <h3>운영 제어</h3>
            <div className="admin-control-grid">
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
                <span>지도 공개</span>
                <input type="checkbox" checked={isPublished} onChange={(event) => setIsPublished(event.target.checked)} />
              </label>
            </div>
          </section>
        </div>

        {visiblePhotos.length > 1 ? (
          <div className="admin-photo-strip-grid">
            {visiblePhotos.slice(1, 5).map((photo) =>
              photo.viewUrl ? <img key={photo.id} src={photo.viewUrl} alt={photo.fileName} className="admin-photo-mini" /> : null,
            )}
          </div>
        ) : null}

        {lead.photoCount > 0 && visiblePhotos.length === 0 ? (
          <div className="inline-diagnostic">
            사진은 저장되었지만 미리보기를 만들지 못했습니다. S3 버킷, IAM 권한, presigned GET URL 생성 여부를 확인해 주세요.
          </div>
        ) : null}

        <label className="field">
          <span>관리자 메모</span>
          <textarea
            className="textarea"
            value={adminMemo}
            onChange={(event) => setAdminMemo(event.target.value)}
            placeholder="노출 여부, 보완 요청, 확인 메모를 여기에 남겨 주세요."
          />
        </label>

        <div className="admin-portfolio-footer">
          <div className="admin-footnotes compact">
            <span>UTM: {[lead.utmSource, lead.utmMedium, lead.utmCampaign].filter(Boolean).join(" / ") || "-"}</span>
            <span>유입 페이지: {lead.landingUrl || "-"}</span>
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
    <div className="admin-portfolio-list">
      {leads.map((lead) => (
        <LeadAdminCard key={lead.id} lead={lead} />
      ))}
    </div>
  );
}
