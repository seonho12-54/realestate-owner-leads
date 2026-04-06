"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react";

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
  const [locationMessage, setLocationMessage] = useState(`매물 접수 전에 현재 위치가 ${SERVICE_REGION_LABEL} 중 한 곳인지 확인해 주세요.`);
  const [addressSearchError, setAddressSearchError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [browserCoords, setBrowserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);
  const [hasAddressSearched, setHasAddressSearched] = useState(false);

  const hasUploadingPhoto = useMemo(() => photos.some((photo) => photo.status === "uploading"), [photos]);

  function handleFieldChange<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleLocationCheck() {
    if (!navigator.geolocation) {
      setLocationMessage("이 브라우저에서는 위치 서비스를 사용할 수 없습니다.");
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
            setLocationMessage(`현재 위치(${result.addressName ?? "확인 불가"})에서는 접수할 수 없습니다.`);
            return;
          }

          setBrowserCoords({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocationMessage(`${result.addressName ?? SERVICE_REGION_LABEL}에서 접속한 것이 확인되었습니다.`);
        } catch (error) {
          setBrowserCoords(null);
          setLocationMessage(error instanceof Error ? error.message : "위치 확인에 실패했습니다.");
        } finally {
          setIsCheckingLocation(false);
        }
      },
      (error) => {
        setIsCheckingLocation(false);

        if (error.code === error.PERMISSION_DENIED) {
          setLocationMessage("브라우저 위치 권한을 허용해 주세요.");
          return;
        }

        if (error.code === error.TIMEOUT) {
          setLocationMessage("위치 확인 시간이 초과되었습니다. 다시 시도해 주세요.");
          return;
        }

        setLocationMessage("현재 위치를 가져오지 못했습니다.");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 1000 * 60 * 3,
      },
    );
  }

  async function handleAddressSearch() {
    const query = addressQuery.trim();

    setHasAddressSearched(true);
    setAddressSearchError(null);
    setSubmitError(null);

    if (!query) {
      setAddressResults([]);
      setAddressSearchError("도로명주소, 지번, 건물명 중 하나를 입력해 주세요.");
      return;
    }

    setIsSearchingAddress(true);

    try {
      const response = await fetch(`/api/location/address-search?query=${encodeURIComponent(query)}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "주소 검색에 실패했습니다.");
      }

      setAddressResults(result.results ?? []);
    } catch (error) {
      setAddressResults([]);
      setAddressSearchError(error instanceof Error ? error.message : "주소 검색에 실패했습니다.");
    } finally {
      setIsSearchingAddress(false);
    }
  }

  function handleAddressKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleAddressSearch();
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
    setAddressSearchError(null);
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
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
    setPhotos((current) => {
      const target = current.find((photo) => photo.id === photoId);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return current.filter((photo) => photo.id !== photoId);
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    if (!browserCoords) {
      setSubmitError("현재 위치 확인 후에만 등록할 수 있습니다.");
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
            <span className="eyebrow">1. 위치 확인</span>
            <h1 className="page-title">허용 지역에서 접속한 경우에만 등록할 수 있어요</h1>
          </div>
          <button type="button" className="button button-secondary" onClick={handleLocationCheck} disabled={isCheckingLocation}>
            {isCheckingLocation ? "확인 중..." : "현재 위치 확인"}
          </button>
        </div>
        <p className="page-copy">{locationMessage}</p>
        <p className="muted-row">허용 지역은 {SERVICE_REGION_LABEL} 입니다.</p>
      </section>

      <section className="form-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">2. 기본 정보</span>
            <h2 className="section-title">등록자와 매물 기본값을 입력해 주세요</h2>
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
              placeholder="예: 다운동 채광 좋은 투룸 전세"
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
              placeholder="예: 평일 10:00~18:00"
            />
          </label>
        </div>
      </section>

      <section className="form-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">3. 주소 찾기</span>
            <h2 className="section-title">다운동 또는 포곡읍 주소만 검색 결과로 보여줍니다</h2>
          </div>
        </div>

        <div className="address-search-shell">
          <p className="muted-row">예: 다운로 120, 다운동 123-4, 포곡로 85, 포곡읍 전대리</p>
          <div className="address-search-row">
            <input
              className="input"
              value={addressQuery}
              onChange={(event) => setAddressQuery(event.target.value)}
              onKeyDown={handleAddressKeyDown}
              placeholder="도로명주소나 지번주소를 입력해 주세요"
            />
            <button type="button" className="button button-secondary" onClick={handleAddressSearch} disabled={isSearchingAddress}>
              {isSearchingAddress ? "검색 중..." : "주소 찾기"}
            </button>
          </div>
          {addressSearchError ? <div className="error-banner">{addressSearchError}</div> : null}
          {selectedAddressLabel ? <p className="muted-row">선택 지역: {selectedAddressLabel}</p> : null}
          {hasAddressSearched && !isSearchingAddress && addressResults.length === 0 && !addressSearchError ? (
            <p className="muted-row">검색 결과가 없습니다. 다운동 또는 포곡읍 주소로 다시 검색해 주세요.</p>
          ) : null}
          {addressResults.length > 0 ? (
            <div className="address-results">
              {addressResults.map((result) => (
                <button
                  key={`${result.addressName}-${result.latitude}-${result.longitude}`}
                  type="button"
                  className="address-result"
                  onClick={() => selectAddress(result)}
                >
                  <strong>{result.roadAddress ?? result.addressName}</strong>
                  <span className="address-result-line">지번: {result.addressName}</span>
                  <span className="address-result-line">
                    지역: {result.region2DepthName} {result.region3DepthName}
                  </span>
                  <span className="address-result-line">우편번호: {result.postalCode ?? "없음"}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="form-grid">
          <label className="field">
            <span>선택한 주소</span>
            <input className="input" value={form.addressLine1} onChange={(event) => handleFieldChange("addressLine1", event.target.value)} />
          </label>
          <label className="field">
            <span>상세 주소</span>
            <input
              className="input"
              value={form.addressLine2}
              onChange={(event) => handleFieldChange("addressLine2", event.target.value)}
              placeholder="동, 호수, 층수를 입력해 주세요"
            />
          </label>
          <label className="field">
            <span>우편번호</span>
            <input className="input" value={form.postalCode} onChange={(event) => handleFieldChange("postalCode", event.target.value)} />
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
            <span>보증금 / 전세가</span>
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
              placeholder="예: 즉시 입주 가능"
            />
          </label>
        </div>
        <label className="field">
          <span>상세 설명</span>
          <textarea
            className="textarea"
            value={form.description}
            onChange={(event) => handleFieldChange("description", event.target.value)}
            placeholder="층수, 방향, 옵션, 주차 가능 여부 등 실제 정보를 적어 주세요"
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
          <span className="muted-row">사진은 S3에 바로 업로드되며, 관리자 공개 후 목록과 상세 화면에 노출됩니다.</span>
        </div>
        {uploadError ? <div className="error-banner">{uploadError}</div> : null}
        {photos.length > 0 ? (
          <div className="photo-grid">
            {photos.map((photo) => (
              <div key={photo.id} className="photo-upload-card">
                <img src={photo.previewUrl} alt={photo.fileName} className="photo-upload-preview" />
                <div className="photo-upload-meta">
                  <strong>{photo.fileName}</strong>
                  <span>
                    {photo.status === "uploaded" ? "업로드 완료" : photo.status === "uploading" ? "업로드 중" : photo.error ?? "업로드 실패"}
                  </span>
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
