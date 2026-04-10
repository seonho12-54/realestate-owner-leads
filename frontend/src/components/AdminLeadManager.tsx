import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import { Link } from "@/components/RouterLink";
import { apiRequest } from "@/lib/api";
import { formatFileSize, prepareImageForUpload, resolveUploadContentType } from "@/lib/client-image";
import { formatArea, formatDateTime, formatTradeLabel, getPropertyTypeLabel } from "@/lib/format";
import type { AdminLeadSummary, UpdateAdminLeadPayload } from "@/lib/leads";
import { updateLeadAdminFields } from "@/lib/leads";
import type { OfficeOption } from "@/lib/offices";
import {
  leadStatusOptions,
  propertyTypeOptions,
  transactionTypeOptions,
  type LeadStatus,
} from "@/lib/validation";

type AdminLeadFormState = {
  officeId: string;
  listingTitle: string;
  ownerName: string;
  phone: string;
  email: string;
  propertyType: string;
  transactionType: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  areaM2: string;
  priceKrw: string;
  depositKrw: string;
  monthlyRentKrw: string;
  moveInDate: string;
  contactTime: string;
  description: string;
  privacyConsent: boolean;
  marketingConsent: boolean;
  status: LeadStatus;
  adminMemo: string;
  isPublished: boolean;
};

type EditablePhoto = {
  id: string;
  s3Key: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  displayOrder: number;
  previewUrl: string | null;
  isObjectUrl: boolean;
  originalFileSize: number;
  optimizedFileSize: number;
  wasCompressed: boolean;
};

function getStatusLabel(status: LeadStatus) {
  return leadStatusOptions.find((option) => option.value === status)?.label ?? status;
}

function numberToInput(value: number | null) {
  return typeof value === "number" ? String(value) : "";
}

function numberOrNull(value: string) {
  const trimmed = value.trim().replaceAll(",", "");
  if (!trimmed) {
    return null;
  }

  const nextValue = Number(trimmed);
  return Number.isFinite(nextValue) ? nextValue : Number.NaN;
}

function createFormState(lead: AdminLeadSummary): AdminLeadFormState {
  return {
    officeId: String(lead.officeId),
    listingTitle: lead.listingTitle,
    ownerName: lead.ownerName,
    phone: lead.phone,
    email: lead.email ?? "",
    propertyType: lead.propertyType,
    transactionType: lead.transactionType,
    addressLine1: lead.addressLine1,
    addressLine2: lead.addressLine2 ?? "",
    postalCode: lead.postalCode ?? "",
    areaM2: numberToInput(lead.areaM2),
    priceKrw: numberToInput(lead.priceKrw),
    depositKrw: numberToInput(lead.depositKrw),
    monthlyRentKrw: numberToInput(lead.monthlyRentKrw),
    moveInDate: lead.moveInDate ?? "",
    contactTime: lead.contactTime ?? "",
    description: lead.description ?? "",
    privacyConsent: lead.privacyConsent,
    marketingConsent: lead.marketingConsent,
    status: lead.status,
    adminMemo: lead.adminMemo ?? "",
    isPublished: lead.isPublished,
  };
}

function createEditablePhotos(lead: AdminLeadSummary): EditablePhoto[] {
  return [...lead.photos]
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map((photo, index) => ({
      id: `existing-${photo.id}`,
      s3Key: photo.s3Key,
      fileName: photo.fileName,
      contentType: photo.contentType ?? "image/jpeg",
      fileSize: Math.max(photo.fileSize ?? 1, 1),
      displayOrder: index,
      previewUrl: photo.viewUrl,
      isObjectUrl: false,
      originalFileSize: Math.max(photo.fileSize ?? 0, 0),
      optimizedFileSize: Math.max(photo.fileSize ?? 0, 0),
      wasCompressed: false,
    }));
}

export function AdminLeadManager({ leads, offices }: { leads: AdminLeadSummary[]; offices: OfficeOption[] }) {
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(leads[0]?.id ?? null);
  const [form, setForm] = useState<AdminLeadFormState | null>(leads[0] ? createFormState(leads[0]) : null);
  const [photos, setPhotos] = useState<EditablePhoto[]>(leads[0] ? createEditablePhotos(leads[0]) : []);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [uploadHint, setUploadHint] = useState<string | null>(null);
  const photosRef = useRef<EditablePhoto[]>(photos);

  const selectedLead = useMemo(() => leads.find((lead) => lead.id === selectedLeadId) ?? leads[0] ?? null, [leads, selectedLeadId]);

  useEffect(() => {
    if (!selectedLead && leads[0]) {
      setSelectedLeadId(leads[0].id);
    }
  }, [leads, selectedLead]);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    if (!selectedLead) {
      setForm(null);
      setPhotos([]);
      return;
    }

    photosRef.current.forEach((photo) => {
      if (photo.isObjectUrl && photo.previewUrl) {
        URL.revokeObjectURL(photo.previewUrl);
      }
    });

    setForm(createFormState(selectedLead));
    setPhotos(createEditablePhotos(selectedLead));
    setMessage(null);
    setUploadHint(null);
  }, [selectedLead]);

  useEffect(() => {
    return () => {
      photosRef.current.forEach((photo) => {
        if (photo.isObjectUrl && photo.previewUrl) {
          URL.revokeObjectURL(photo.previewUrl);
        }
      });
    };
  }, []);

  async function uploadSinglePhoto(file: File, indexOffset: number) {
    const prepared = await prepareImageForUpload(file);
    const contentType = resolveUploadContentType(prepared.file);

    if (!contentType) {
      throw new Error("이미지 형식을 확인할 수 없습니다. JPG, PNG, WEBP 파일만 업로드해 주세요.");
    }

    const presign = await apiRequest<{ key: string; uploadUrl: string }>("/api/uploads/presign", {
      method: "POST",
      json: {
        fileName: prepared.file.name,
        contentType,
        fileSize: prepared.file.size,
      },
    });

    const uploadResponse = await fetch(presign.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
      },
      body: prepared.file,
    });

    if (!uploadResponse.ok) {
      throw new Error("사진 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }

    return {
      id: `${Date.now()}-${indexOffset}-${prepared.file.name}`,
      s3Key: presign.key,
      fileName: prepared.file.name,
      contentType,
      fileSize: prepared.file.size,
      displayOrder: indexOffset,
      previewUrl: URL.createObjectURL(prepared.file),
      isObjectUrl: true,
      originalFileSize: prepared.originalFileSize,
      optimizedFileSize: prepared.optimizedFileSize,
      wasCompressed: prepared.wasCompressed,
    } satisfies EditablePhoto;
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFiles = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (nextFiles.length === 0) {
      return;
    }

    try {
      setIsUploadingPhotos(true);
      setMessage(null);

      const existingCount = photos.length;
      const uploadedPhotos: EditablePhoto[] = [];

      for (const [offset, file] of nextFiles.entries()) {
        const uploaded = await uploadSinglePhoto(file, existingCount + offset);
        uploadedPhotos.push(uploaded);
      }

      const combinedPhotos = [...photos, ...uploadedPhotos].map((photo, index) => ({
        ...photo,
        displayOrder: index,
      }));

      setPhotos(combinedPhotos);

      const compressedCount = uploadedPhotos.filter((photo) => photo.wasCompressed).length;
      setUploadHint(
        compressedCount > 0
          ? `${compressedCount}장의 사진을 최적화해서 업로드했습니다.`
          : "사진 업로드가 완료되었습니다.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "사진 업로드에 실패했습니다.");
    } finally {
      setIsUploadingPhotos(false);
    }
  }

  function handleRemovePhoto(photoId: string) {
    setPhotos((current) => {
      const target = current.find((photo) => photo.id === photoId);
      if (target?.isObjectUrl && target.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }

      return current
        .filter((photo) => photo.id !== photoId)
        .map((photo, index) => ({
          ...photo,
          displayOrder: index,
        }));
    });
  }

  async function handleSave() {
    if (!selectedLead || !form) {
      return;
    }

    const payload: UpdateAdminLeadPayload = {
      officeId: Number(form.officeId),
      listingTitle: form.listingTitle.trim(),
      ownerName: form.ownerName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() ? form.email.trim() : null,
      propertyType: form.propertyType,
      transactionType: form.transactionType,
      addressLine1: form.addressLine1.trim(),
      addressLine2: form.addressLine2.trim(),
      postalCode: form.postalCode.trim(),
      areaM2: numberOrNull(form.areaM2),
      priceKrw: numberOrNull(form.priceKrw),
      depositKrw: numberOrNull(form.depositKrw),
      monthlyRentKrw: numberOrNull(form.monthlyRentKrw),
      moveInDate: form.moveInDate.trim(),
      contactTime: form.contactTime.trim(),
      description: form.description.trim(),
      privacyConsent: form.privacyConsent,
      marketingConsent: form.marketingConsent,
      status: form.status,
      adminMemo: form.adminMemo.trim(),
      isPublished: form.isPublished,
      photos: photos.map((photo, index) => ({
        s3Key: photo.s3Key,
        fileName: photo.fileName,
        contentType: photo.contentType,
        fileSize: photo.fileSize,
        displayOrder: index,
      })),
    };

    try {
      setIsSaving(true);
      setMessage(null);

      await updateLeadAdminFields(selectedLead.id, payload);

      setMessage("매물 수정 내용을 저장했습니다. 최신 정보로 다시 불러옵니다.");
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
        <p>새 접수가 들어오면 이 화면에서 내용을 수정하고 공개 여부를 관리할 수 있습니다.</p>
      </div>
    );
  }

  if (!selectedLead || !form) {
    return null;
  }

  return (
    <div className="admin-grid">
      <section className="page-panel admin-list-panel">
        <div className="admin-list">
          {leads.map((lead) => {
            const previewPhoto = lead.photos.find((photo) => Boolean(photo.viewUrl))?.viewUrl ?? null;

            return (
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

                {previewPhoto ? (
                  <div className="admin-card-thumb-wrap">
                    <img className="admin-card-thumb" src={previewPhoto} alt={lead.listingTitle} />
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="page-panel admin-detail-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">관리자 수정</span>
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
            <span>접수 회원</span>
            <strong>{selectedLead.userEmail ?? "비회원 접수"}</strong>
          </div>
          <div>
            <span>등록 시각</span>
            <strong>{formatDateTime(selectedLead.createdAt)}</strong>
          </div>
          <div>
            <span>현재 면적</span>
            <strong>{formatArea(selectedLead.areaM2)}</strong>
          </div>
          <div>
            <span>현재 거래 정보</span>
            <strong>{formatTradeLabel(selectedLead)}</strong>
          </div>
        </div>

        <section className="admin-form-section">
          <div className="section-heading section-heading-compact">
            <div>
              <span className="eyebrow">사진</span>
              <h3 className="section-title section-title-small">등록 사진</h3>
            </div>

            <label className="button button-secondary button-small photo-picker-button">
              사진 추가
              <input type="file" accept="image/*" multiple hidden onChange={handlePhotoChange} />
            </label>
          </div>

          {uploadHint ? <div className="success-banner">{uploadHint}</div> : null}

          <div className="admin-photo-grid">
            {photos.length === 0 ? (
              <div className="empty-panel">
                <strong>등록된 사진이 없습니다.</strong>
                <p>여기서 새 사진을 추가하거나 기존 사진을 정리할 수 있습니다.</p>
              </div>
            ) : (
              photos.map((photo) => (
                <article key={photo.id} className="admin-photo-card">
                  {photo.previewUrl ? (
                    <img className="admin-photo-thumb" src={photo.previewUrl} alt={photo.fileName} />
                  ) : (
                    <div className="admin-photo-thumb admin-photo-thumb-empty">미리보기 없음</div>
                  )}
                  <div className="admin-photo-meta">
                    <strong>{photo.fileName}</strong>
                    <span>
                      {photo.originalFileSize > 0 ? formatFileSize(photo.originalFileSize) : "기존 사진"}
                      {photo.wasCompressed ? ` -> ${formatFileSize(photo.optimizedFileSize)}` : ""}
                    </span>
                  </div>
                  <button type="button" className="button button-ghost button-small" onClick={() => handleRemovePhoto(photo.id)}>
                    사진 제거
                  </button>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="admin-form-section">
          <div className="section-heading section-heading-compact">
            <div>
              <span className="eyebrow">매물 정보</span>
              <h3 className="section-title section-title-small">등록 내용 전체 수정</h3>
            </div>
          </div>

          <div className="form-grid two-column">
            <label className="field">
              <span>중개사무소</span>
              <select
                className="input"
                value={form.officeId}
                onChange={(event) => setForm((current) => (current ? { ...current, officeId: event.target.value } : current))}
              >
                <option value="">중개사무소를 선택해 주세요</option>
                {offices.map((office) => (
                  <option key={office.id} value={office.id}>
                    {office.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>매물 제목</span>
              <input
                className="input"
                value={form.listingTitle}
                onChange={(event) => setForm((current) => (current ? { ...current, listingTitle: event.target.value } : current))}
              />
            </label>

            <label className="field">
              <span>집주인 이름</span>
              <input
                className="input"
                value={form.ownerName}
                onChange={(event) => setForm((current) => (current ? { ...current, ownerName: event.target.value } : current))}
              />
            </label>

            <label className="field">
              <span>연락처</span>
              <input
                className="input"
                value={form.phone}
                onChange={(event) => setForm((current) => (current ? { ...current, phone: event.target.value } : current))}
              />
            </label>

            <label className="field">
              <span>이메일</span>
              <input
                className="input"
                value={form.email}
                onChange={(event) => setForm((current) => (current ? { ...current, email: event.target.value } : current))}
              />
            </label>

            <label className="field">
              <span>입주 가능 시기</span>
              <input
                className="input"
                value={form.moveInDate}
                onChange={(event) => setForm((current) => (current ? { ...current, moveInDate: event.target.value } : current))}
              />
            </label>

            <label className="field">
              <span>매물 유형</span>
              <select
                className="input"
                value={form.propertyType}
                onChange={(event) => setForm((current) => (current ? { ...current, propertyType: event.target.value } : current))}
              >
                {propertyTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>거래 유형</span>
              <select
                className="input"
                value={form.transactionType}
                onChange={(event) => setForm((current) => (current ? { ...current, transactionType: event.target.value } : current))}
              >
                {transactionTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>면적</span>
              <input
                className="input"
                value={form.areaM2}
                onChange={(event) => setForm((current) => (current ? { ...current, areaM2: event.target.value } : current))}
              />
            </label>

            <label className="field">
              <span>연락 가능 시간</span>
              <input
                className="input"
                value={form.contactTime}
                onChange={(event) => setForm((current) => (current ? { ...current, contactTime: event.target.value } : current))}
              />
            </label>

            <label className="field">
              <span>매매가</span>
              <input
                className="input"
                value={form.priceKrw}
                onChange={(event) => setForm((current) => (current ? { ...current, priceKrw: event.target.value } : current))}
              />
            </label>

            <label className="field">
              <span>보증금 / 전세가</span>
              <input
                className="input"
                value={form.depositKrw}
                onChange={(event) => setForm((current) => (current ? { ...current, depositKrw: event.target.value } : current))}
              />
            </label>

            <label className="field">
              <span>월세</span>
              <input
                className="input"
                value={form.monthlyRentKrw}
                onChange={(event) => setForm((current) => (current ? { ...current, monthlyRentKrw: event.target.value } : current))}
              />
            </label>

            <label className="field">
              <span>우편번호</span>
              <input
                className="input"
                value={form.postalCode}
                onChange={(event) => setForm((current) => (current ? { ...current, postalCode: event.target.value } : current))}
              />
            </label>
          </div>

          <label className="field">
            <span>주소</span>
            <input
              className="input"
              value={form.addressLine1}
              onChange={(event) => setForm((current) => (current ? { ...current, addressLine1: event.target.value } : current))}
            />
          </label>

          <label className="field">
            <span>상세 주소</span>
            <input
              className="input"
              value={form.addressLine2}
              onChange={(event) => setForm((current) => (current ? { ...current, addressLine2: event.target.value } : current))}
            />
          </label>

          <label className="field">
            <span>설명</span>
            <textarea
              className="textarea"
              value={form.description}
              onChange={(event) => setForm((current) => (current ? { ...current, description: event.target.value } : current))}
            />
          </label>
        </section>

        <section className="admin-form-section">
          <div className="section-heading section-heading-compact">
            <div>
              <span className="eyebrow">운영 관리</span>
              <h3 className="section-title section-title-small">상태와 공개 설정</h3>
            </div>
          </div>

          <div className="form-grid two-column">
            <label className="field">
              <span>상태</span>
              <select
                className="input"
                value={form.status}
                onChange={(event) => setForm((current) => (current ? { ...current, status: event.target.value as LeadStatus } : current))}
              >
                {leadStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="check-item check-item-inline">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(event) => setForm((current) => (current ? { ...current, isPublished: event.target.checked } : current))}
              />
              <span>공개 게시</span>
            </label>

            <label className="check-item check-item-inline">
              <input
                type="checkbox"
                checked={form.privacyConsent}
                onChange={(event) => setForm((current) => (current ? { ...current, privacyConsent: event.target.checked } : current))}
              />
              <span>개인정보 동의</span>
            </label>

            <label className="check-item check-item-inline">
              <input
                type="checkbox"
                checked={form.marketingConsent}
                onChange={(event) => setForm((current) => (current ? { ...current, marketingConsent: event.target.checked } : current))}
              />
              <span>마케팅 동의</span>
            </label>
          </div>

          <label className="field">
            <span>관리자 메모</span>
            <textarea
              className="textarea"
              value={form.adminMemo}
              onChange={(event) => setForm((current) => (current ? { ...current, adminMemo: event.target.value } : current))}
              placeholder="보완 요청, 공개 보류 사유, 연락 메모 등을 적어 주세요."
            />
          </label>

          <div className="inline-note-list">
            <span className={`inline-note${selectedLead.locationVerified ? " success" : ""}`}>
              {selectedLead.locationVerified ? "위치 인증 완료" : "위치 인증 미완료"}
            </span>
            <span className="inline-note">{selectedLead.officeName}</span>
            <span className="inline-note">{getPropertyTypeLabel(selectedLead.propertyType)}</span>
          </div>
        </section>

        {message ? <div className="success-banner">{message}</div> : null}

        <div className="button-row">
          <button type="button" className="button button-primary" onClick={handleSave} disabled={isSaving || isUploadingPhotos}>
            {isSaving ? "저장 중..." : "변경 저장"}
          </button>
        </div>
      </section>
    </div>
  );
}
