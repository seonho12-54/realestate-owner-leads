import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";

import { Link } from "@/components/RouterLink";
import { SellMapPreview } from "@/components/SellMapPreview";
import { createLead } from "@/lib/leads";
import { apiFetch, apiRequest } from "@/lib/api";
import { formatFileSize, prepareImageForUpload, resolveUploadContentType } from "@/lib/client-image";
import { useRouter } from "@/lib/router";
import type { OfficeOption } from "@/lib/offices";
import { getValidationMessage, leadCreateSchema, propertyTypeOptions, transactionTypeOptions, type LeadPhotoInput } from "@/lib/validation";

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

type UploadedPhoto = LeadPhotoInput & {
  id: string;
  previewUrl: string;
  originalFileSize: number;
  optimizedFileSize: number;
  wasCompressed: boolean;
};

type CreateLeadFormState = {
  officeId: string;
  listingTitle: string;
  ownerName: string;
  phone: string;
  email: string;
  propertyType: string;
  transactionType: string;
  addressLine2: string;
  areaM2: string;
  priceKrw: string;
  depositKrw: string;
  monthlyRentKrw: string;
  moveInDate: string;
  contactTime: string;
  description: string;
  privacyConsent: boolean;
  marketingConsent: boolean;
};

const EMPTY_SEARCH_RESULTS: AddressCandidate[] = [];

function createInitialState(initialOfficeId: number | null, userName: string | null, userEmail: string | null): CreateLeadFormState {
  return {
    officeId: initialOfficeId ? String(initialOfficeId) : "",
    listingTitle: "",
    ownerName: userName ?? "",
    phone: "",
    email: userEmail ?? "",
    propertyType: "apartment",
    transactionType: "sale",
    addressLine2: "",
    areaM2: "",
    priceKrw: "",
    depositKrw: "",
    monthlyRentKrw: "",
    moveInDate: "",
    contactTime: "",
    description: "",
    privacyConsent: false,
    marketingConsent: false,
  };
}

function normalizeAddressResults(response: unknown): AddressCandidate[] {
  const value = response as { results?: unknown };
  if (!value || !Array.isArray(value.results)) {
    return EMPTY_SEARCH_RESULTS;
  }

  return value.results
    .map((item) => {
      const candidate = item as Partial<AddressCandidate>;
      if (
        typeof candidate.addressName !== "string" ||
        typeof candidate.latitude !== "number" ||
        typeof candidate.longitude !== "number" ||
        typeof candidate.region1DepthName !== "string" ||
        typeof candidate.region2DepthName !== "string" ||
        typeof candidate.region3DepthName !== "string"
      ) {
        return null;
      }

      return {
        addressName: candidate.addressName,
        roadAddress: typeof candidate.roadAddress === "string" ? candidate.roadAddress : null,
        postalCode: typeof candidate.postalCode === "string" ? candidate.postalCode : null,
        latitude: candidate.latitude,
        longitude: candidate.longitude,
        region1DepthName: candidate.region1DepthName,
        region2DepthName: candidate.region2DepthName,
        region3DepthName: candidate.region3DepthName,
      };
    })
    .filter((candidate): candidate is AddressCandidate => Boolean(candidate));
}

function numberOrNull(value: string) {
  const trimmed = value.trim().replaceAll(",", "");
  if (!trimmed) {
    return null;
  }

  const nextValue = Number(trimmed);
  return Number.isFinite(nextValue) ? nextValue : Number.NaN;
}

export function SellLeadForm({
  offices,
  initialOfficeId,
  userName,
  userEmail,
  browserCoords,
  isAdmin,
}: {
  offices: OfficeOption[];
  initialOfficeId: number | null;
  userName: string | null;
  userEmail: string | null;
  browserCoords: { latitude: number; longitude: number } | null;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState(() => createInitialState(initialOfficeId, userName, userEmail));
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AddressCandidate[]>(EMPTY_SEARCH_RESULTS);
  const [selectedAddress, setSelectedAddress] = useState<AddressCandidate | null>(null);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadHint, setUploadHint] = useState<string | null>(null);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      officeId: current.officeId || (initialOfficeId ? String(initialOfficeId) : offices[0] ? String(offices[0].id) : ""),
      ownerName: current.ownerName || userName || "",
      email: current.email || userEmail || "",
    }));
  }, [initialOfficeId, offices, userEmail, userName]);

  useEffect(() => {
    return () => {
      photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    };
  }, [photos]);

  const selectedAddressLine = selectedAddress?.roadAddress || selectedAddress?.addressName || "";
  const previewCoords = browserCoords ?? (isAdmin && selectedAddress ? { latitude: selectedAddress.latitude, longitude: selectedAddress.longitude } : null);

  async function handleAddressSearch() {
    const trimmedQuery = searchQuery.trim();

    if (trimmedQuery.length < 2) {
      setError("주소 검색어를 2자 이상 입력해 주세요.");
      return;
    }

    try {
      setIsSearchingAddress(true);
      setError(null);

      const response = await apiRequest<unknown>(`/api/location/address-search?query=${encodeURIComponent(trimmedQuery)}`);
      const nextResults = normalizeAddressResults(response);
      setSearchResults(nextResults);

      if (nextResults.length === 0) {
        setError("검색 결과가 없습니다. 도로명, 지번, 건물명으로 다시 검색해 주세요.");
      }
    } catch (searchError) {
      setSearchResults(EMPTY_SEARCH_RESULTS);
      setError(searchError instanceof Error ? searchError.message : "주소 검색에 실패했습니다.");
    } finally {
      setIsSearchingAddress(false);
    }
  }

  function handleAddressKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleAddressSearch();
    }
  }

  function handleSelectAddress(candidate: AddressCandidate) {
    setSelectedAddress(candidate);
    setSearchResults(EMPTY_SEARCH_RESULTS);
    setError(null);
  }

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
      throw new Error("사진 업로드에 실패했습니다. S3 버킷 권한 또는 CORS 설정을 확인해 주세요.");
    }

    return {
      id: `${Date.now()}-${indexOffset}-${prepared.file.name}`,
      previewUrl: URL.createObjectURL(prepared.file),
      s3Key: presign.key,
      fileName: prepared.file.name,
      contentType,
      fileSize: prepared.file.size,
      displayOrder: indexOffset,
      originalFileSize: prepared.originalFileSize,
      optimizedFileSize: prepared.optimizedFileSize,
      wasCompressed: prepared.wasCompressed,
    } satisfies UploadedPhoto;
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFiles = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (nextFiles.length === 0) {
      return;
    }

    try {
      setIsUploadingPhotos(true);
      setError(null);

      const existingCount = photos.length;
      const uploadedPhotos: UploadedPhoto[] = [];

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
      if (compressedCount > 0) {
        setUploadHint(`${compressedCount}장의 사진을 브라우저에서 먼저 압축한 뒤 업로드했습니다.`);
      } else {
        setUploadHint("사진 업로드가 완료되었습니다.");
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "사진 업로드에 실패했습니다.");
    } finally {
      setIsUploadingPhotos(false);
    }
  }

  function handleRemovePhoto(photoId: string) {
    setPhotos((current) => {
      const target = current.find((photo) => photo.id === photoId);
      if (target) {
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (isUploadingPhotos) {
      setError("사진 업로드가 끝난 뒤 접수해 주세요.");
      return;
    }

    if (!selectedAddress) {
      setError("주소 검색 결과에서 등록 주소를 먼저 선택해 주세요.");
      return;
    }

    const submitLatitude = browserCoords?.latitude ?? selectedAddress.latitude;
    const submitLongitude = browserCoords?.longitude ?? selectedAddress.longitude;

    const utm = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();

    const payload = {
      officeId: Number(form.officeId),
      listingTitle: form.listingTitle,
      ownerName: form.ownerName,
      phone: form.phone,
      email: form.email,
      propertyType: form.propertyType,
      transactionType: form.transactionType,
      addressLine1: selectedAddressLine,
      addressLine2: form.addressLine2,
      postalCode: selectedAddress.postalCode ?? "",
      areaM2: numberOrNull(form.areaM2),
      priceKrw: numberOrNull(form.priceKrw),
      depositKrw: numberOrNull(form.depositKrw),
      monthlyRentKrw: numberOrNull(form.monthlyRentKrw),
      moveInDate: form.moveInDate,
      contactTime: form.contactTime,
      description: form.description,
      privacyConsent: form.privacyConsent,
      marketingConsent: form.marketingConsent,
      utmSource: utm.get("utm_source") ?? "",
      utmMedium: utm.get("utm_medium") ?? "",
      utmCampaign: utm.get("utm_campaign") ?? "",
      utmTerm: utm.get("utm_term") ?? "",
      utmContent: utm.get("utm_content") ?? "",
      referrerUrl: typeof document !== "undefined" ? document.referrer : "",
      landingUrl: typeof window !== "undefined" ? window.location.href : "",
      browserLatitude: submitLatitude,
      browserLongitude: submitLongitude,
      photos: photos.map((photo) => ({
        s3Key: photo.s3Key,
        fileName: photo.fileName,
        contentType: photo.contentType,
        fileSize: photo.fileSize,
        displayOrder: photo.displayOrder,
      })),
    };

    const validation = leadCreateSchema.safeParse(payload);
    if (!validation.success) {
      setError(getValidationMessage(validation.error));
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await createLead(validation.data);
      router.replace(`/sell/done?id=${result.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "매물 접수에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="sell-form" onSubmit={handleSubmit}>
      <section className="page-panel form-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">기본 정보</span>
            <h2 className="section-title">집주인 연락처와 매물 개요를 입력해 주세요.</h2>
          </div>
          <div className="inline-note-list">
            <span className="inline-note success">{isAdmin ? "관리자 접수" : "회원 접수"}</span>
          </div>
        </div>

        <div className="form-grid two-column">
          <label className="field">
            <span>중개사무소</span>
            <select className="input" value={form.officeId} onChange={(event) => setForm((current) => ({ ...current, officeId: event.target.value }))}>
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
              onChange={(event) => setForm((current) => ({ ...current, listingTitle: event.target.value }))}
              placeholder="예: 포곡읍 전대리 채광 좋은 2룸"
            />
          </label>

          <label className="field">
            <span>이름</span>
            <input className="input" value={form.ownerName} onChange={(event) => setForm((current) => ({ ...current, ownerName: event.target.value }))} />
          </label>

          <label className="field">
            <span>연락처</span>
            <input
              className="input"
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              inputMode="tel"
              placeholder="010-1234-5678"
            />
          </label>

          <label className="field">
            <span>이메일</span>
            <input
              className="input"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              inputMode="email"
              placeholder="name@example.com"
            />
          </label>

          <label className="field">
            <span>연락 가능 시간</span>
            <input
              className="input"
              value={form.contactTime}
              onChange={(event) => setForm((current) => ({ ...current, contactTime: event.target.value }))}
              placeholder="예: 평일 10:00~18:00"
            />
          </label>
        </div>
      </section>

      <section className="page-panel form-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">주소 찾기</span>
            <h2 className="section-title">도로명, 지번, 건물명으로 검색하고 정확한 등록 주소를 선택해 주세요.</h2>
          </div>
        </div>

        <div className="address-search-shell">
          <div className="address-search-row">
            <input
              className="input"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={handleAddressKeyDown}
              placeholder="예: 다운로 120, 다운동 160, 포곡로 85, 전대리"
            />
            <button type="button" className="button button-secondary" onClick={() => void handleAddressSearch()} disabled={isSearchingAddress}>
              {isSearchingAddress ? "검색 중..." : "주소 찾기"}
            </button>
          </div>

          {searchResults.length > 0 ? (
            <div className="address-results">
              {searchResults.map((candidate) => {
                const active = selectedAddress?.addressName === candidate.addressName && selectedAddress.latitude === candidate.latitude;

                return (
                  <button
                    key={`${candidate.addressName}-${candidate.latitude}-${candidate.longitude}`}
                    type="button"
                    className={`address-result${active ? " selected" : ""}`}
                    onClick={() => handleSelectAddress(candidate)}
                  >
                    <span className="address-result-line">
                      <strong>{candidate.roadAddress || candidate.addressName}</strong>
                    </span>
                    <span className="address-result-line">{candidate.addressName}</span>
                    <span className="address-result-line">
                      {candidate.region1DepthName} {candidate.region2DepthName} {candidate.region3DepthName}
                      {candidate.postalCode ? ` · ${candidate.postalCode}` : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {selectedAddress ? (
            <div className="address-selected-summary">
              <div>
                <span>선택한 주소</span>
                <strong>{selectedAddressLine}</strong>
              </div>
              <div>
                <span>지역</span>
                <strong>
                  {selectedAddress.region1DepthName} {selectedAddress.region2DepthName} {selectedAddress.region3DepthName}
                </strong>
              </div>
              <div>
                <span>우편번호</span>
                <strong>{selectedAddress.postalCode || "-"}</strong>
              </div>
            </div>
          ) : null}

          <label className="field">
            <span>상세 주소</span>
            <input
              className="input"
              value={form.addressLine2}
              onChange={(event) => setForm((current) => ({ ...current, addressLine2: event.target.value }))}
              placeholder="동, 호수, 층수 등 상세 정보를 입력해 주세요"
            />
          </label>

          <SellMapPreview browserCoords={previewCoords} selectedAddress={selectedAddress} transactionType={form.transactionType} />
        </div>
      </section>

      <section className="page-panel form-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">거래 정보</span>
            <h2 className="section-title">거래 방식과 가격 정보를 입력해 주세요.</h2>
          </div>
        </div>

        <div className="form-grid two-column">
          <label className="field">
            <span>매물 유형</span>
            <select className="input" value={form.propertyType} onChange={(event) => setForm((current) => ({ ...current, propertyType: event.target.value }))}>
              {propertyTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>거래 유형</span>
            <select className="input" value={form.transactionType} onChange={(event) => setForm((current) => ({ ...current, transactionType: event.target.value }))}>
              {transactionTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>전용 면적(㎡)</span>
            <input
              className="input"
              value={form.areaM2}
              onChange={(event) => setForm((current) => ({ ...current, areaM2: event.target.value }))}
              placeholder="예: 59.9"
            />
          </label>

          <label className="field">
            <span>입주 가능 시기</span>
            <input
              className="input"
              value={form.moveInDate}
              onChange={(event) => setForm((current) => ({ ...current, moveInDate: event.target.value }))}
              placeholder="예: 즉시 입주 / 6월 말"
            />
          </label>

          <label className="field">
            <span>매매가</span>
            <input
              className="input"
              value={form.priceKrw}
              onChange={(event) => setForm((current) => ({ ...current, priceKrw: event.target.value }))}
              placeholder="예: 450000000"
            />
          </label>

          <label className="field">
            <span>보증금 / 전세가</span>
            <input
              className="input"
              value={form.depositKrw}
              onChange={(event) => setForm((current) => ({ ...current, depositKrw: event.target.value }))}
              placeholder="예: 100000000"
            />
          </label>

          <label className="field">
            <span>월세</span>
            <input
              className="input"
              value={form.monthlyRentKrw}
              onChange={(event) => setForm((current) => ({ ...current, monthlyRentKrw: event.target.value }))}
              placeholder="예: 600000"
            />
          </label>
        </div>

        <label className="field">
          <span>상세 설명</span>
          <textarea
            className="textarea"
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="주차, 채광, 층수, 관리비, 특이사항 등을 자유롭게 적어 주세요."
          />
        </label>
      </section>

      <section className="page-panel form-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">사진 업로드</span>
            <h2 className="section-title">브라우저에서 먼저 압축한 뒤 S3로 업로드합니다.</h2>
          </div>
        </div>

        <div className="button-row">
          <label className="button button-secondary button-small photo-picker-button">
            사진 선택
            <input type="file" accept="image/*" multiple hidden onChange={handlePhotoChange} />
          </label>
          <span className="page-copy compact-copy">JPG, PNG, WEBP 권장 · 사진이 많을수록 업로드 시간이 길어질 수 있습니다.</span>
        </div>

        {uploadHint ? <div className="success-banner">{uploadHint}</div> : null}

        <div className="photo-grid">
          {photos.length === 0 ? (
            <div className="empty-panel">
              <strong>아직 업로드한 사진이 없습니다.</strong>
              <p>사진은 선택 순서대로 저장되고, 관리자 승인 후 공개 목록에 반영됩니다.</p>
            </div>
          ) : (
            photos.map((photo) => (
              <article key={photo.id} className="photo-upload-card">
                <img className="photo-upload-preview" src={photo.previewUrl} alt={photo.fileName} />
                <div className="photo-upload-meta">
                  <strong>{photo.fileName}</strong>
                  <span>
                    {formatFileSize(photo.originalFileSize)}
                    {photo.wasCompressed ? ` → ${formatFileSize(photo.optimizedFileSize)}` : ""}
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

      <section className="page-panel form-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">동의 및 접수</span>
            <h2 className="section-title">동의 내용을 확인한 뒤 접수를 완료해 주세요.</h2>
          </div>
        </div>

        <div className="check-list">
          <label className="check-item">
            <input
              type="checkbox"
              checked={form.privacyConsent}
              onChange={(event) => setForm((current) => ({ ...current, privacyConsent: event.target.checked }))}
            />
            <span>
              개인정보 수집 및 이용에 동의합니다. <Link href="/privacy">처리방침 보기</Link>
            </span>
          </label>

          <label className="check-item">
            <input
              type="checkbox"
              checked={form.marketingConsent}
              onChange={(event) => setForm((current) => ({ ...current, marketingConsent: event.target.checked }))}
            />
            <span>중개 진행 관련 안내 연락 수신에 동의합니다. (선택)</span>
          </label>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}

        <div className="button-row">
          <button className="button button-primary" type="submit" disabled={isSubmitting || isUploadingPhotos}>
            {isSubmitting ? "접수 중..." : "매물 접수하기"}
          </button>
          <Link href="/" className="button button-secondary">
            홈으로 돌아가기
          </Link>
        </div>
      </section>
    </form>
  );
}
