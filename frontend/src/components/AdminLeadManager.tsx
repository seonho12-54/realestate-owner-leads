import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import { Link } from "@/components/RouterLink";
import { getAdminLeadsPath } from "@/lib/admin-lead-status";
import { formatFileSize } from "@/lib/client-image";
import { formatArea, formatDateTime, formatTradeLabel, getPropertyTypeLabel } from "@/lib/format";
import {
  createEditablePhotos,
  getPhotoUploadErrorMessage,
  releaseEditablePhoto,
  releaseEditablePhotos,
  reindexEditablePhotos,
  toLeadPhotoInputs,
  uploadEditablePhoto,
  type EditableLeadPhoto,
} from "@/lib/lead-photo-editor";
import type { AdminLeadSummary, UpdateAdminLeadPayload } from "@/lib/leads";
import { updateLeadAdminFields } from "@/lib/leads";
import type { OfficeOption } from "@/lib/offices";
import { useRouter } from "@/lib/router";
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

const statusActionLabels: Record<LeadStatus, string> = {
  new: "신규접수로",
  contacted: "연락완료로",
  reviewing: "검토중으로",
  completed: "처리완료로",
  closed: "반려/보류로",
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

export function AdminLeadManager({
  leads,
  offices,
  activeStatus,
}: {
  leads: AdminLeadSummary[];
  offices: OfficeOption[];
  activeStatus: LeadStatus | null;
}) {
  const router = useRouter();
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(leads[0]?.id ?? null);
  const [form, setForm] = useState<AdminLeadFormState | null>(leads[0] ? createFormState(leads[0]) : null);
  const [photos, setPhotos] = useState<EditableLeadPhoto[]>(leads[0] ? createEditablePhotos(leads[0].photos) : []);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [uploadHint, setUploadHint] = useState<string | null>(null);
  const photosRef = useRef<EditableLeadPhoto[]>(photos);

  const selectedLead = useMemo(() => leads.find((lead) => lead.id === selectedLeadId) ?? leads[0] ?? null, [leads, selectedLeadId]);

  useEffect(() => {
    if (!selectedLead && leads[0]) {
      setSelectedLeadId(leads[0].id);
      return;
    }

    if (selectedLead && !leads.some((lead) => lead.id === selectedLead.id)) {
      setSelectedLeadId(leads[0]?.id ?? null);
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

    releaseEditablePhotos(photosRef.current);

    const nextPhotos = createEditablePhotos(selectedLead.photos);
    photosRef.current = nextPhotos;
    setForm(createFormState(selectedLead));
    setPhotos(nextPhotos);
    setMessage(null);
    setUploadHint(null);
  }, [selectedLead]);

  useEffect(() => {
    return () => {
      releaseEditablePhotos(photosRef.current);
    };
  }, []);

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
      const uploadedPhotos: EditableLeadPhoto[] = [];

      for (const [offset, file] of nextFiles.entries()) {
        uploadedPhotos.push(await uploadEditablePhoto(file, existingCount + offset));
      }

      setPhotos((current) => reindexEditablePhotos([...current, ...uploadedPhotos]));

      const compressedCount = uploadedPhotos.filter((photo) => photo.wasCompressed).length;
      setUploadHint(
        compressedCount > 0
          ? `${compressedCount}장의 사진을 최적화해서 업로드했습니다.`
          : "사진 업로드를 마쳤습니다.",
      );
    } catch (error: any) {
      setMessage(getPhotoUploadErrorMessage(error));
      return;
      setMessage(error instanceof Error ? error.message : "사진 업로드에 실패했습니다.");
    } finally {
      setIsUploadingPhotos(false);
    }
  }

  function handleRemovePhoto(photoId: string) {
    setPhotos((current) => {
      const target = current.find((photo) => photo.localId === photoId);
      if (target) {
        releaseEditablePhoto(target);
      }

      return reindexEditablePhotos(current.filter((photo) => photo.localId !== photoId));
    });
  }

  function buildPayload(nextStatus = form?.status ?? "reviewing"): UpdateAdminLeadPayload | null {
    if (!form) {
      return null;
    }

    return {
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
      status: nextStatus,
      adminMemo: form.adminMemo.trim(),
      isPublished: form.isPublished,
      photos: toLeadPhotoInputs(photos),
    };
  }

  async function persistLead(options?: { nextStatus?: LeadStatus; nextPath?: string; successMessage?: string }) {
    if (!selectedLead || !form) {
      return;
    }

    const nextStatus = options?.nextStatus ?? form.status;
    const payload = buildPayload(nextStatus);

    if (!payload) {
      return;
    }

    try {
      setIsSaving(true);
      setMessage(null);

      await updateLeadAdminFields(selectedLead.id, payload);

      const successMessage = options?.successMessage ?? "변경 내용을 저장했습니다.";
      setMessage(successMessage);

      if (options?.nextPath) {
        if (window.location.pathname === options.nextPath) {
          router.refresh();
        } else {
          router.replace(options.nextPath);
        }
        return;
      }

      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusMove(nextStatus: LeadStatus) {
    if (!form) {
      return;
    }

    setForm((current) => (current ? { ...current, status: nextStatus } : current));

    await persistLead({
      nextStatus,
      nextPath: getAdminLeadsPath(nextStatus),
      successMessage: `${getStatusLabel(nextStatus)} 분류로 이동했습니다.`,
    });
  }

  if (leads.length === 0) {
    return (
      <div className="empty-panel">
        <strong>선택된 분류에 매물이 없습니다.</strong>
        <p>상단 분류 버튼을 눌러 다른 상태를 확인하거나, 새 접수가 들어오면 여기에서 바로 관리할 수 있습니다.</p>
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

          <div className="button-row">
            <Link href={getAdminLeadsPath(activeStatus)} className="button button-secondary button-small">
              현재 분류 보기
            </Link>
            {selectedLead.isPublished ? (
              <Link href={`/listings/${selectedLead.id}`} className="button button-secondary button-small">
                공개 상세 보기
              </Link>
            ) : null}
          </div>
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
              <span className="eyebrow">상태 이동</span>
              <h3 className="section-title section-title-small">분류 변경 버튼</h3>
            </div>
          </div>

          <p className="page-copy compact-copy">버튼을 누르면 저장 후 해당 분류 페이지로 바로 이동합니다.</p>

          <div className="button-row">
            {leadStatusOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`button button-small ${form.status === option.value ? "button-primary" : "button-secondary"}`}
                onClick={() => void handleStatusMove(option.value)}
                disabled={isSaving || isUploadingPhotos}
              >
                {statusActionLabels[option.value]}
              </button>
            ))}
          </div>
        </section>

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
                <p>사진을 추가하거나 불필요한 사진을 지운 뒤 저장할 수 있습니다.</p>
              </div>
            ) : (
              photos.map((photo) => (
                <article key={photo.localId} className="admin-photo-card">
                  {photo.previewUrl ? (
                    <img className="admin-photo-thumb" src={photo.previewUrl} alt={photo.fileName} />
                  ) : (
                    <div className="admin-photo-thumb admin-photo-thumb-empty">미리보기를 준비 중입니다.</div>
                  )}
                  <div className="admin-photo-meta">
                    <strong>{photo.fileName}</strong>
                    <span>
                      {photo.originalFileSize > 0 ? formatFileSize(photo.originalFileSize) : "기존 등록 사진"}
                      {photo.wasCompressed ? ` -> ${formatFileSize(photo.optimizedFileSize)}` : ""}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="button button-ghost button-small"
                    onClick={() => handleRemovePhoto(photo.localId)}
                  >
                    사진 삭제
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
                <option value="">중개사무소를 선택해 주세요.</option>
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
              placeholder="보완 요청, 공개 보류 사유, 연락 메모를 적어 주세요."
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
          <button
            type="button"
            className="button button-primary"
            onClick={() => void persistLead()}
            disabled={isSaving || isUploadingPhotos}
          >
            {isSaving ? "저장 중..." : "변경 저장"}
          </button>
        </div>
      </section>
    </div>
  );
}
