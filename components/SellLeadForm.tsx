"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { OfficeOption } from "@/lib/offices";
import { SERVICE_REGION_LABEL } from "@/lib/service-area";
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

type AddressCandidate = {
  addressName: string;
  roadAddress: string | null;
  postalCode: string | null;
  latitude: number;
  longitude: number;
  region1DepthName: string;
  region2DepthName: string;
  region3DepthName: string;
};

type FormState = {
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
  userName,
  userEmail,
}: {
  offices: OfficeOption[];
  initialOfficeId?: number | null;
  userName?: string | null;
  userEmail?: string | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    officeId: initialOfficeId ? String(initialOfficeId) : offices[0] ? String(offices[0].id) : "",
    listingTitle: "",
    ownerName: userName ?? "",
    phone: "",
    email: userEmail ?? "",
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
  const [addressQuery, setAddressQuery] = useState("");
  const [addressResults, setAddressResults] = useState<AddressCandidate[]>([]);
  const [selectedAddressLabel, setSelectedAddressLabel] = useState<string | null>(null);
  const [locationMessage, setLocationMessage] = useState("서비스 사용 전에 현재 위치 확인이 필요합니다.");
  const [browserCoords, setBrowserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);

  const hasUploadingPhoto = useMemo(() => photos.some((photo) => photo.status === "uploading"), [photos]);

  function handleFieldChange<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleLocationCheck() {
    if (!navigator.geolocation) {
      setLocationMessage("이 브라우저는 위치 서비스를 지원하지 않습니다.");
      return;
    }

    setIsCheckingLocation(true);
    setLocationMessage("현재 위치를 확인하고 있습니다.");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch("/api/location/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }),
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error ?? "위치 확인에 실패했습니다.");
          }

          if (!result.allowed) {
            setBrowserCoords(null);
            setLocationMessage(`현재 위치(${result.addressName ?? "알 수 없음"})에서는 서비스를 사용할 수 없습니다.`);
            return;
          }

          setBrowserCoords({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocationMessage(`${result.addressName ?? SERVICE_REGION_LABEL}에서 접속이 확인되었습니다.`);
        } catch (error) {
          setBrowserCoords(null);
          setLocationMessage(error instanceof Error ? error.message : "위치 확인에 실패했습니다.");
        } finally {
          setIsCheckingLocation(false);
        }
      },
      () => {
        setIsCheckingLocation(false);
        setLocationMessage("브라우저 위치 권한을 허용해 주세요.");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 1000 * 60 * 3,
      },
    );
  }

  async function handleAddressSearch() {
    if (!addressQuery.trim()) {
      return;
    }

    setIsSearchingAddress(true);
    setSubmitError(null);

    try {
      const response = await fetch(`/api/location/address-search?query=${encodeURIComponent(addressQuery.trim())}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "주소 검색에 실패했습니다.");
      }

      setAddressResults(result.results ?? []);
    } catch (error) {
      setAddressResults([]);
      setSubmitError(error instanceof Error ? error.message : "주소 검색에 실패했습니다.");
    } finally {
      setIsSearchingAddress(false);
    }
  }

  function selectAddress(address: AddressCandidate) {
    setForm((current) => ({
      ...current,
      addressLine1: address.roadAddress ?? address.addressName,
      postalCode: address.postalCode ?? current.postalCode,
    }));
    setSelectedAddressLabel(`${address.region2DepthName} ${address.region3DepthName}`);
    setAddressResults([]);
    setAddressQuery(address.roadAddress ?? address.addressName);
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    setUploadError(null);

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

  function removePhoto(photoId: string) {
    setPhotos((current) => current.filter((photo) => photo.id !== photoId));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    if (!browserCoords) {
      setSubmitError("현재 위치 확인 후 등록할 수 있습니다.");
      return;
    }

    if (hasUploadingPhoto) {
      setSubmitError("사진 업로드가 끝난 뒤 등록해 주세요.");
      return;
    }

    const currentUrl = typeof window !== "undefined" ? new URL(window.location.href) : null;

    const payload = {
      officeId: Number(form.officeId),
      listingTitle: form.listingTitle,
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
      utmSource: currentUrl?.searchParams.get("utm_source") ?? "",
      utmMedium: currentUrl?.searchParams.get("utm_medium") ?? "",
      utmCampaign: currentUrl?.searchParams.get("utm_campaign") ?? "",
      utmTerm: currentUrl?.searchParams.get("utm_term") ?? "",
      utmContent: currentUrl?.searchParams.get("utm_content") ?? "",
      referrerUrl: typeof document !== "undefined" ? document.referrer : "",
      landingUrl: typeof window !== "undefined" ? window.location.href : "",
      browserLatitude: browserCoords.latitude,
      browserLongitude: browserCoords.longitude,
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
        throw new Error(result.error ?? "매물 등록에 실패했습니다.");
      }

      router.push(`/sell/done?id=${result.id}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "매물 등록에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (offices.length === 0) {
    return (
      <div className="empty-panel">
        <strong>활성화된 중개사무소가 없습니다</strong>
        <p>`offices` 테이블에 중개사무소 데이터를 먼저 넣어 주세요.</p>
      </div>
    );
  }

  return (
    <form className="form-layout" onSubmit={handleSubmit}>
      <section className="form-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">1. 지역 확인</span>
            <h1 className="page-title">울산광역시 중구 매물만 등록할 수 있습니다</h1>
          </div>
          <button type="button" className="button button-secondary" onClick={handleLocationCheck} disabled={isCheckingLocation}>
            {isCheckingLocation ? "확인 중..." : "현재 위치 확인"}
          </button>
        </div>
        <p className="page-copy">{locationMessage}</p>
      </section>

      <section className="form-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">2. 기본 정보</span>
            <h2 className="section-title">노출될 매물 기본값을 먼저 입력해 주세요</h2>
          </div>
        </div>
        <div className="form-grid">
          <label className="field">
            <span>중개사무소</span>
            <select className="input" value={form.officeId} onChange={(event) => handleFieldChange("officeId", event.target.value)}>
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
              onChange={(event) => handleFieldChange("listingTitle", event.target.value)}
              placeholder="예: 다운동 채광 좋은 투룸 월세"
            />
          </label>
          <label className="field">
            <span>이름</span>
            <input className="input" value={form.ownerName} onChange={(event) => handleFieldChange("ownerName", event.target.value)} />
          </label>
          <label className="field">
            <span>연락처</span>
            <input className="input" value={form.phone} onChange={(event) => handleFieldChange("phone", event.target.value)} inputMode="tel" />
          </label>
          <label className="field">
            <span>이메일</span>
            <input className="input" value={form.email} onChange={(event) => handleFieldChange("email", event.target.value)} inputMode="email" />
          </label>
          <label className="field">
            <span>연락 가능 시간</span>
            <input
              className="input"
              value={form.contactTime}
              onChange={(event) => handleFieldChange("contactTime", event.target.value)}
              placeholder="평일 10시~18시"
            />
          </label>
        </div>
      </section>

      <section className="form-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">3. 주소 검색</span>
            <h2 className="section-title">카카오 주소 검색으로 중구 주소를 선택해 주세요</h2>
          </div>
        </div>
        <div className="address-search-row">
          <input
            className="input"
            value={addressQuery}
            onChange={(event) => setAddressQuery(event.target.value)}
            placeholder="도로명이나 지번 주소 입력"
          />
          <button type="button" className="button button-secondary" onClick={handleAddressSearch} disabled={isSearchingAddress}>
            {isSearchingAddress ? "검색 중..." : "주소 검색"}
          </button>
        </div>
        {selectedAddressLabel ? <p className="muted-row">선택 지역: {selectedAddressLabel}</p> : null}
        {addressResults.length > 0 ? (
          <div className="address-results">
            {addressResults.map((result) => (
              <button key={`${result.addressName}-${result.latitude}`} type="button" className="address-result" onClick={() => selectAddress(result)}>
                <strong>{result.roadAddress ?? result.addressName}</strong>
                <span>
                  {result.region2DepthName} {result.region3DepthName}
                </span>
              </button>
            ))}
          </div>
        ) : null}
        <div className="form-grid">
          <label className="field">
            <span>선택된 주소</span>
            <input className="input" value={form.addressLine1} onChange={(event) => handleFieldChange("addressLine1", event.target.value)} />
          </label>
          <label className="field">
            <span>상세 주소</span>
            <input
              className="input"
              value={form.addressLine2}
              onChange={(event) => handleFieldChange("addressLine2", event.target.value)}
              placeholder="동, 호수"
            />
          </label>
        </div>
      </section>

      <section className="form-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">4. 거래 정보</span>
            <h2 className="section-title">가격, 면적, 설명을 입력해 주세요</h2>
          </div>
        </div>
        <div className="form-grid">
          <label className="field">
            <span>매물 유형</span>
            <select className="input" value={form.propertyType} onChange={(event) => handleFieldChange("propertyType", event.target.value)}>
              {propertyTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>거래 유형</span>
            <select className="input" value={form.transactionType} onChange={(event) => handleFieldChange("transactionType", event.target.value)}>
              {transactionTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>전용면적(㎡)</span>
            <input className="input" value={form.areaM2} onChange={(event) => handleFieldChange("areaM2", event.target.value)} inputMode="decimal" />
          </label>
          <label className="field">
            <span>매매가</span>
            <input className="input" value={form.priceKrw} onChange={(event) => handleFieldChange("priceKrw", event.target.value)} inputMode="numeric" />
          </label>
          <label className="field">
            <span>전세가 / 보증금</span>
            <input className="input" value={form.depositKrw} onChange={(event) => handleFieldChange("depositKrw", event.target.value)} inputMode="numeric" />
          </label>
          <label className="field">
            <span>월세</span>
            <input
              className="input"
              value={form.monthlyRentKrw}
              onChange={(event) => handleFieldChange("monthlyRentKrw", event.target.value)}
              inputMode="numeric"
            />
          </label>
          <label className="field">
            <span>입주 가능 시기</span>
            <input
              className="input"
              value={form.moveInDate}
              onChange={(event) => handleFieldChange("moveInDate", event.target.value)}
              placeholder="즉시 가능 / 협의"
            />
          </label>
        </div>
        <label className="field">
          <span>상세 설명</span>
          <textarea
            className="textarea"
            value={form.description}
            onChange={(event) => handleFieldChange("description", event.target.value)}
            placeholder="층수, 주차, 옵션, 주변 환경 등 실제 노출될 설명을 적어 주세요."
          />
        </label>
      </section>

      <section className="form-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">5. 사진 업로드</span>
            <h2 className="section-title">최대 10장까지 등록할 수 있습니다</h2>
          </div>
        </div>
        <div className="field">
          <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple onChange={handleFileChange} />
          <span className="muted-row">S3에 직접 업로드되며, 관리자 검토 후 공개됩니다.</span>
        </div>
        {uploadError ? <div className="error-banner">{uploadError}</div> : null}
        {photos.length > 0 ? (
          <div className="photo-grid">
            {photos.map((photo) => (
              <div key={photo.id} className="photo-upload-card">
                <img src={photo.previewUrl} alt={photo.fileName} className="photo-upload-preview" />
                <div className="photo-upload-meta">
                  <strong>{photo.fileName}</strong>
                  <span>{photo.status === "uploaded" ? "업로드 완료" : photo.status === "uploading" ? "업로드 중" : photo.error ?? "실패"}</span>
                </div>
                <button type="button" className="button button-ghost button-small" onClick={() => removePhoto(photo.id)}>
                  제거
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="form-card">
        <div className="check-list">
          <label className="check-item">
            <input
              type="checkbox"
              checked={form.privacyConsent}
              onChange={(event) => handleFieldChange("privacyConsent", event.target.checked)}
            />
            <span>개인정보 수집 및 이용에 동의합니다. (필수)</span>
          </label>
          <label className="check-item">
            <input
              type="checkbox"
              checked={form.marketingConsent}
              onChange={(event) => handleFieldChange("marketingConsent", event.target.checked)}
            />
            <span>추가 상담 및 알림 수신에 동의합니다. (선택)</span>
          </label>
        </div>
        {submitError ? <div className="error-banner">{submitError}</div> : null}
        <div className="button-row">
          <button className="button button-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "등록 중..." : "매물 등록하기"}
          </button>
          <Link href="/privacy" className="button button-secondary">
            개인정보 처리방침
          </Link>
        </div>
      </section>
    </form>
  );
}
