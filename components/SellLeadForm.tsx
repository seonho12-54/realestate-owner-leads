"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { OfficeOption } from "@/lib/offices";
import { getValidationMessage, leadCreateSchema, propertyTypeOptions, transactionTypeOptions } from "@/lib/validation";

type UploadedPhoto = {
  id: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  previewUrl: string;
  s3Key: string | null;
  status: "uploading" | "uploaded" | "error";
  error?: string;
};

type FormState = {
  officeId: string;
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
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
  referrerUrl: string;
  landingUrl: string;
};

const MAX_PHOTO_COUNT = 10;
const MAX_PHOTO_SIZE_MB = 20;

export function SellLeadForm({
  offices,
  initialOfficeId,
}: {
  offices: OfficeOption[];
  initialOfficeId?: number | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    officeId: initialOfficeId ? String(initialOfficeId) : offices[0] ? String(offices[0].id) : "",
    ownerName: "",
    phone: "",
    email: "",
    propertyType: propertyTypeOptions[0].value,
    transactionType: transactionTypeOptions[0].value,
    addressLine1: "",
    addressLine2: "",
    postalCode: "",
    areaM2: "",
    priceKrw: "",
    depositKrw: "",
    monthlyRentKrw: "",
    moveInDate: "",
    contactTime: "",
    description: "",
    privacyConsent: false,
    marketingConsent: false,
    utmSource: "",
    utmMedium: "",
    utmCampaign: "",
    utmTerm: "",
    utmContent: "",
    referrerUrl: "",
    landingUrl: "",
  });
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);

    setForm((current) => ({
      ...current,
      utmSource: url.searchParams.get("utm_source") ?? "",
      utmMedium: url.searchParams.get("utm_medium") ?? "",
      utmCampaign: url.searchParams.get("utm_campaign") ?? "",
      utmTerm: url.searchParams.get("utm_term") ?? "",
      utmContent: url.searchParams.get("utm_content") ?? "",
      referrerUrl: document.referrer ?? "",
      landingUrl: window.location.href,
    }));
  }, []);

  useEffect(() => {
    return () => {
      photos.forEach((photo) => {
        URL.revokeObjectURL(photo.previewUrl);
      });
    };
  }, [photos]);

  const hasUploadingPhoto = useMemo(() => photos.some((photo) => photo.status === "uploading"), [photos]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    setUploadError(null);

    if (selectedFiles.length === 0) {
      return;
    }

    if (photos.length + selectedFiles.length > MAX_PHOTO_COUNT) {
      setUploadError(`사진은 최대 ${MAX_PHOTO_COUNT}장까지 등록할 수 있습니다.`);
      return;
    }

    for (const file of selectedFiles) {
      if (file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024) {
        setUploadError(`사진 1장당 최대 ${MAX_PHOTO_SIZE_MB}MB까지 업로드할 수 있습니다.`);
        continue;
      }

      const localId = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);

      setPhotos((current) => [
        ...current,
        {
          id: localId,
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
          previewUrl,
          s3Key: null,
          status: "uploading",
        },
      ]);

      try {
        const presignResponse = await fetch("/api/uploads/presign", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type,
            fileSize: file.size,
          }),
        });

        const presignPayload = await presignResponse.json();

        if (!presignResponse.ok) {
          throw new Error(presignPayload.error ?? "업로드 URL을 만들지 못했습니다.");
        }

        const uploadResponse = await fetch(presignPayload.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
          },
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error("사진 업로드에 실패했습니다.");
        }

        setPhotos((current) =>
          current.map((photo) =>
            photo.id === localId
              ? {
                  ...photo,
                  s3Key: presignPayload.key,
                  status: "uploaded",
                }
              : photo,
          ),
        );
      } catch (error) {
        setPhotos((current) =>
          current.map((photo) =>
            photo.id === localId
              ? {
                  ...photo,
                  status: "error",
                  error: error instanceof Error ? error.message : "업로드 중 오류가 발생했습니다.",
                }
              : photo,
          ),
        );
      }
    }
  }

  function handleFieldChange<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function removePhoto(photoId: string) {
    setPhotos((current) => {
      const target = current.find((photo) => photo.id === photoId);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }

      return current.filter((photo) => photo.id !== photoId);
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    if (hasUploadingPhoto) {
      setSubmitError("사진 업로드가 끝난 뒤 접수해 주세요.");
      return;
    }

    const payload = {
      officeId: Number(form.officeId),
      ownerName: form.ownerName,
      phone: form.phone,
      email: form.email,
      propertyType: form.propertyType,
      transactionType: form.transactionType,
      addressLine1: form.addressLine1,
      addressLine2: form.addressLine2,
      postalCode: form.postalCode,
      areaM2: form.areaM2,
      priceKrw: form.priceKrw,
      depositKrw: form.depositKrw,
      monthlyRentKrw: form.monthlyRentKrw,
      moveInDate: form.moveInDate,
      contactTime: form.contactTime,
      description: form.description,
      privacyConsent: form.privacyConsent,
      marketingConsent: form.marketingConsent,
      utmSource: form.utmSource,
      utmMedium: form.utmMedium,
      utmCampaign: form.utmCampaign,
      utmTerm: form.utmTerm,
      utmContent: form.utmContent,
      referrerUrl: form.referrerUrl,
      landingUrl: form.landingUrl,
      photos: photos
        .filter((photo) => photo.status === "uploaded" && photo.s3Key)
        .map((photo, index) => ({
          s3Key: photo.s3Key!,
          fileName: photo.fileName,
          contentType: photo.contentType,
          fileSize: photo.fileSize,
          displayOrder: index,
        })),
    };

    const validation = leadCreateSchema.safeParse(payload);
    if (!validation.success) {
      setSubmitError(getValidationMessage(validation.error));
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "매물 접수에 실패했습니다.");
      }

      router.push(`/sell/done?id=${result.id}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "요청을 처리하지 못했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (offices.length === 0) {
    return (
      <div className="notice-card">
        <h2 className="section-title">접수 준비가 아직 끝나지 않았습니다</h2>
        <p className="section-copy">
          활성화된 중개사무소가 없어 접수 폼을 표시할 수 없습니다. 먼저 `offices` 테이블에 운영할 사무소를 등록해 주세요.
        </p>
      </div>
    );
  }

  return (
    <form className="form-shell" onSubmit={handleSubmit}>
      <div className="section-card">
        <div className="top-line">
          <div>
            <h2 className="section-title">기본 정보</h2>
            <p className="section-copy">집주인 연락처와 접수할 사무소를 먼저 입력해 주세요.</p>
          </div>
          <span className="eyebrow">모바일 우선 접수</span>
        </div>
        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="officeId">중개사무소</label>
            <select
              id="officeId"
              className="select-input"
              value={form.officeId}
              onChange={(event) => handleFieldChange("officeId", event.target.value)}
            >
              {offices.map((office) => (
                <option key={office.id} value={office.id}>
                  {office.name}
                  {office.phone ? ` · ${office.phone}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="ownerName">성함</label>
            <input
              id="ownerName"
              className="text-input"
              value={form.ownerName}
              onChange={(event) => handleFieldChange("ownerName", event.target.value)}
              placeholder="집주인 성함"
            />
          </div>
          <div className="field-group">
            <label htmlFor="phone">연락처</label>
            <input
              id="phone"
              className="text-input"
              value={form.phone}
              onChange={(event) => handleFieldChange("phone", event.target.value)}
              inputMode="tel"
              placeholder="010-1234-5678"
            />
          </div>
          <div className="field-group">
            <label htmlFor="email">이메일</label>
            <input
              id="email"
              className="text-input"
              value={form.email}
              onChange={(event) => handleFieldChange("email", event.target.value)}
              inputMode="email"
              placeholder="선택 입력"
            />
          </div>
        </div>
      </div>

      <div className="section-card">
        <h2 className="section-title">매물 정보</h2>
        <p className="section-copy">주소, 거래 유형, 희망 금액 등 기본 매물 정보를 적어 주세요.</p>
        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="propertyType">매물 종류</label>
            <select
              id="propertyType"
              className="select-input"
              value={form.propertyType}
              onChange={(event) => handleFieldChange("propertyType", event.target.value)}
            >
              {propertyTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="transactionType">거래 유형</label>
            <select
              id="transactionType"
              className="select-input"
              value={form.transactionType}
              onChange={(event) => handleFieldChange("transactionType", event.target.value)}
            >
              {transactionTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="addressLine1">주소</label>
            <input
              id="addressLine1"
              className="text-input"
              value={form.addressLine1}
              onChange={(event) => handleFieldChange("addressLine1", event.target.value)}
              placeholder="기본 주소"
            />
          </div>
          <div className="field-group">
            <label htmlFor="addressLine2">상세 주소</label>
            <input
              id="addressLine2"
              className="text-input"
              value={form.addressLine2}
              onChange={(event) => handleFieldChange("addressLine2", event.target.value)}
              placeholder="동, 호수 등"
            />
          </div>
          <div className="field-group">
            <label htmlFor="postalCode">우편번호</label>
            <input
              id="postalCode"
              className="text-input"
              value={form.postalCode}
              onChange={(event) => handleFieldChange("postalCode", event.target.value)}
              placeholder="선택 입력"
            />
          </div>
          <div className="field-group">
            <label htmlFor="areaM2">전용면적(㎡)</label>
            <input
              id="areaM2"
              className="text-input"
              value={form.areaM2}
              onChange={(event) => handleFieldChange("areaM2", event.target.value)}
              inputMode="decimal"
              placeholder="예: 84.97"
            />
          </div>
          <div className="field-group">
            <label htmlFor="priceKrw">희망 매매가</label>
            <input
              id="priceKrw"
              className="text-input"
              value={form.priceKrw}
              onChange={(event) => handleFieldChange("priceKrw", event.target.value)}
              inputMode="numeric"
              placeholder="숫자만 입력"
            />
          </div>
          <div className="field-group">
            <label htmlFor="depositKrw">보증금 / 전세금</label>
            <input
              id="depositKrw"
              className="text-input"
              value={form.depositKrw}
              onChange={(event) => handleFieldChange("depositKrw", event.target.value)}
              inputMode="numeric"
              placeholder="숫자만 입력"
            />
          </div>
          <div className="field-group">
            <label htmlFor="monthlyRentKrw">월세</label>
            <input
              id="monthlyRentKrw"
              className="text-input"
              value={form.monthlyRentKrw}
              onChange={(event) => handleFieldChange("monthlyRentKrw", event.target.value)}
              inputMode="numeric"
              placeholder="숫자만 입력"
            />
          </div>
          <div className="field-group">
            <label htmlFor="moveInDate">입주 가능 시기</label>
            <input
              id="moveInDate"
              className="text-input"
              value={form.moveInDate}
              onChange={(event) => handleFieldChange("moveInDate", event.target.value)}
              placeholder="예: 즉시 입주 가능"
            />
          </div>
          <div className="field-group">
            <label htmlFor="contactTime">연락 가능 시간</label>
            <input
              id="contactTime"
              className="text-input"
              value={form.contactTime}
              onChange={(event) => handleFieldChange("contactTime", event.target.value)}
              placeholder="예: 평일 10시~18시"
            />
          </div>
        </div>
        <div className="field-group">
          <label htmlFor="description">추가 설명</label>
          <textarea
            id="description"
            className="text-area"
            value={form.description}
            onChange={(event) => handleFieldChange("description", event.target.value)}
            placeholder="층수, 방향, 관리비, 특이사항 등을 자유롭게 적어 주세요."
          />
        </div>
      </div>

      <div className="section-card">
        <h2 className="section-title">사진 업로드</h2>
        <p className="section-copy">사진은 S3 presigned URL로 업로드되며, 접수 완료 후 관리자 화면에서 수량과 파일명을 확인할 수 있습니다.</p>
        <div className="upload-zone">
          <div className="field-group">
            <label htmlFor="leadPhotos">사진 선택</label>
            <input
              id="leadPhotos"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              multiple
              onChange={handleFileChange}
            />
            <span className="field-hint">최대 {MAX_PHOTO_COUNT}장, 장당 {MAX_PHOTO_SIZE_MB}MB 이하</span>
          </div>
          {uploadError ? <p className="error-text">{uploadError}</p> : null}
          {photos.length > 0 ? (
            <div className="upload-list">
              {photos.map((photo) => (
                <div className="photo-item" key={photo.id}>
                  <div className="photo-meta">
                    <strong>{photo.fileName}</strong>
                    <span className={`photo-status${photo.status === "error" ? " is-error" : ""}`}>
                      {photo.status === "uploading" && "업로드 중"}
                      {photo.status === "uploaded" && "업로드 완료"}
                      {photo.status === "error" && (photo.error ?? "업로드 실패")}
                    </span>
                  </div>
                  <button type="button" className="btn-secondary" onClick={() => removePhoto(photo.id)}>
                    제거
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="section-card">
        <h2 className="section-title">개인정보 수집 및 연락 동의</h2>
        <div className="field-group">
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.privacyConsent}
              onChange={(event) => handleFieldChange("privacyConsent", event.target.checked)}
            />
            <span className="checkbox-copy">
              <strong>개인정보 수집 및 이용에 동의합니다. (필수)</strong>
              <span>
                접수 확인과 매물 상담을 위해 이름, 연락처, 매물 정보를 수집합니다. 자세한 내용은{" "}
                <Link href="/privacy">개인정보 처리방침</Link>에서 확인할 수 있습니다.
              </span>
            </span>
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.marketingConsent}
              onChange={(event) => handleFieldChange("marketingConsent", event.target.checked)}
            />
            <span className="checkbox-copy">
              <strong>추가 매물 상담 및 마케팅 안내 수신에 동의합니다. (선택)</strong>
            </span>
          </label>
        </div>
        {submitError ? <div className="error-banner">{submitError}</div> : null}
        <div className="cta-row">
          <button className="btn" type="submit" disabled={isSubmitting || hasUploadingPhoto}>
            {isSubmitting ? "접수 중..." : "매물 접수하기"}
          </button>
          <Link className="btn-secondary" href="/privacy">
            개인정보 처리방침 보기
          </Link>
        </div>
      </div>
    </form>
  );
}

