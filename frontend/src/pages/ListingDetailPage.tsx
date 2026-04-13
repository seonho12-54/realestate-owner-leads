import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useParams } from "react-router-dom";

import { Link } from "@/components/RouterLink";
import { useSession } from "@/context/SessionContext";
import { ApiError } from "@/lib/api";
import { getAdminLeadsPath } from "@/lib/admin-lead-status";
import { formatFileSize } from "@/lib/client-image";
import { formatArea, formatDateTime, formatTradeLabel, getPropertyTypeLabel, getTransactionTypeLabel } from "@/lib/format";
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
import {
  getAdminLeadDetail,
  getPublishedListingDetail,
  updateLeadAdminFields,
  type AdminLeadSummary,
  type LeadDetail,
} from "@/lib/leads";
import { isSavedListing, pushRecentListing, toggleSavedListing } from "@/lib/listing-prefs";
import { useRouter } from "@/lib/router";
import { leadStatusOptions, type LeadStatus } from "@/lib/validation";

const detailStatusActionLabels: Record<LeadStatus, string> = {
  new: "신규접수로",
  contacted: "연락완료로",
  reviewing: "검토중으로",
  completed: "처리완료로",
  closed: "반려/보류로",
};

function getStatusLabel(status: LeadStatus) {
  return leadStatusOptions.find((option) => option.value === status)?.label ?? status;
}

function DetailBlockedState({ listingId }: { listingId: number | null }) {
  const nextUrl = listingId ? `/listings/${listingId}` : "/";

  return (
    <div className="page-stack">
      <section className="page-panel detail-hero">
        <div>
          <span className="eyebrow">공개 상세</span>
          <h1 className="page-title page-title-medium">인증 후 상세 매물 정보를 볼 수 있어요.</h1>
          <p className="page-copy">
            상세 주소, 연락처, 전체 사진은 인증된 동네 사용자에게만 공개됩니다. 로그인 후 위치 인증을 마치면 실제 매물 정보를 바로 볼 수 있어요.
          </p>
        </div>
        <div className="button-row">
          <Link href="/" className="button button-primary">
            홈으로 이동
          </Link>
          <Link href={`/login?next=${encodeURIComponent(nextUrl)}`} className="button button-secondary">
            로그인
          </Link>
        </div>
      </section>

      <section className="gallery-grid">
        <div className="empty-panel">
          <strong>사진은 인증 후 공개됩니다.</strong>
          <p>대표 이미지와 상세 사진은 위치 인증이 끝나면 그대로 볼 수 있습니다.</p>
        </div>
        <div className="empty-panel">
          <strong>가격과 거래 정보는 미리 확인 가능해요.</strong>
          <p>매매가, 전세가, 월세, 면적 정보는 인증 후 실제 데이터로 채워집니다.</p>
        </div>
        <div className="empty-panel">
          <strong>중개사무소 정보도 함께 열립니다.</strong>
          <p>인증이 끝나면 중개사무소 연락처와 주소도 함께 확인할 수 있습니다.</p>
        </div>
      </section>

      <section className="detail-grid-shell">
        <div className="detail-card">
          <h2 className="section-title">매물 정보</h2>
          <div className="detail-info-grid">
            <div>
              <span>거래 유형</span>
              <strong>인증 후 공개</strong>
            </div>
            <div>
              <span>매물 유형</span>
              <strong>인증 후 공개</strong>
            </div>
            <div>
              <span>면적</span>
              <strong>인증 후 공개</strong>
            </div>
            <div>
              <span>동네</span>
              <strong>인증된 사용자 전용</strong>
            </div>
          </div>
        </div>

        <div className="detail-card">
          <h2 className="section-title">상세 설명</h2>
          <p className="page-copy">설명, 특이사항, 입주 가능 시기, 연락 가능 시간은 인증 후 실제 매물 정보로 보여집니다.</p>
        </div>

        <div className="detail-card">
          <h2 className="section-title">연락 정보</h2>
          <p className="page-copy">중개사무소 연락처와 주소는 위치 인증이 끝난 뒤 공개됩니다.</p>
        </div>
      </section>
    </div>
  );
}

function DetailErrorState({
  title,
  message,
  listingId,
}: {
  title: string;
  message: string;
  listingId: number | null;
}) {
  const manageHref = listingId ? "/manage" : "/";

  return (
    <div className="page-stack">
      <section className="page-panel">
        <span className="eyebrow">상세 보기</span>
        <h1 className="page-title page-title-medium">{title}</h1>
        <p className="page-copy compact-copy">{message}</p>
        <div className="button-row">
          <Link href="/explore" className="button button-primary">
            둘러보기로 이동
          </Link>
          <Link href={manageHref} className="button button-secondary">
            매물 관리
          </Link>
        </div>
      </section>
    </div>
  );
}

export function ListingDetailPage() {
  const { listingId: listingIdParam } = useParams();
  const { session } = useSession();
  const router = useRouter();
  const [listing, setListing] = useState<LeadDetail | null>(null);
  const [adminLead, setAdminLead] = useState<AdminLeadSummary | null>(null);
  const [adminPhotos, setAdminPhotos] = useState<EditableLeadPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const [adminUploadHint, setAdminUploadHint] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [isAdminSaving, setIsAdminSaving] = useState(false);
  const [isAdminUploading, setIsAdminUploading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const adminPhotosRef = useRef<EditableLeadPhoto[]>(adminPhotos);

  const listingId = useMemo(() => {
    const value = Number(listingIdParam);
    return Number.isFinite(value) && value > 0 ? value : null;
  }, [listingIdParam]);

  const canReadDetail = session.kind === "admin" || session.region.locked;
  const visiblePhotos = useMemo(() => listing?.photos.filter((photo) => Boolean(photo.viewUrl)) ?? [], [listing]);

  useEffect(() => {
    adminPhotosRef.current = adminPhotos;
  }, [adminPhotos]);

  useEffect(() => {
    return () => {
      releaseEditablePhotos(adminPhotosRef.current);
    };
  }, []);

  useEffect(() => {
    if (listingId == null) {
      setListing(null);
      setError("올바른 매물 주소가 아니에요.");
      setErrorCode("INVALID_LISTING_ID");
      setIsLoading(false);
      return;
    }

    setIsSaved(isSavedListing(listingId));
  }, [listingId]);

  useEffect(() => {
    if (listingId == null) {
      return;
    }

    if (session.isLoading) {
      return;
    }

    if (!canReadDetail) {
      setListing(null);
      setError(null);
      setErrorCode(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    getPublishedListingDetail(listingId)
      .then((response) => {
        if (!isMounted) {
          return;
        }

        setListing(response);
        setError(null);
        setErrorCode(null);
        pushRecentListing(listingId);
      })
      .catch((loadError) => {
        if (!isMounted) {
          return;
        }

        if (loadError instanceof ApiError) {
          setErrorCode(loadError.code);
          setError(loadError.message);
          return;
        }

        setErrorCode(null);
        setError(loadError instanceof Error ? loadError.message : "매물 상세를 불러오지 못했어요.");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [canReadDetail, listingId, session.isLoading]);

  useEffect(() => {
    if (listingId == null || session.isLoading || session.kind !== "admin") {
      setAdminLead(null);
      releaseEditablePhotos(adminPhotosRef.current);
      adminPhotosRef.current = [];
      setAdminPhotos([]);
      setIsAdminLoading(false);
      return;
    }

    let isMounted = true;
    setIsAdminLoading(true);

    getAdminLeadDetail(listingId)
      .then((response) => {
        if (!isMounted) {
          return;
        }

        releaseEditablePhotos(adminPhotosRef.current);
        const nextPhotos = createEditablePhotos(response.photos);
        adminPhotosRef.current = nextPhotos;
        setAdminLead(response);
        setAdminPhotos(nextPhotos);
        setAdminMessage(null);
        setAdminUploadHint(null);
      })
      .catch((loadError) => {
        if (!isMounted) {
          return;
        }

        setAdminLead(null);
        setAdminPhotos([]);
        setAdminMessage(loadError instanceof Error ? loadError.message : "관리자 편집 정보를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (isMounted) {
          setIsAdminLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [listingId, session.isLoading, session.kind]);

  function handleToggleSave() {
    if (listingId == null || session.kind === "admin") {
      return;
    }

    setIsSaved(toggleSavedListing(listingId).includes(listingId));
  }

  async function handleAdminPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFiles = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (nextFiles.length === 0) {
      return;
    }

    try {
      setIsAdminUploading(true);
      setAdminMessage(null);

      const existingCount = adminPhotos.length;
      const uploadedPhotos: EditableLeadPhoto[] = [];

      for (const [offset, file] of nextFiles.entries()) {
        uploadedPhotos.push(await uploadEditablePhoto(file, existingCount + offset));
      }

      setAdminPhotos((current) => reindexEditablePhotos([...current, ...uploadedPhotos]));

      const compressedCount = uploadedPhotos.filter((photo) => photo.wasCompressed).length;
      setAdminUploadHint(
        compressedCount > 0
          ? `${compressedCount}장의 사진을 최적화해서 업로드했습니다.`
          : "사진 업로드를 마쳤습니다.",
      );
    } catch (uploadError: any) {
      setAdminMessage(getPhotoUploadErrorMessage(uploadError));
      return;
      setAdminMessage(uploadError instanceof Error ? uploadError.message : "사진 업로드에 실패했습니다.");
    } finally {
      setIsAdminUploading(false);
    }
  }

  function handleAdminPhotoRemove(photoId: string) {
    setAdminPhotos((current) => {
      const target = current.find((photo) => photo.localId === photoId);
      if (target) {
        releaseEditablePhoto(target);
      }

      return reindexEditablePhotos(current.filter((photo) => photo.localId !== photoId));
    });
  }

  function buildAdminPayload(lead: AdminLeadSummary, nextStatus = lead.status) {
    return {
      officeId: lead.officeId,
      listingTitle: lead.listingTitle,
      ownerName: lead.ownerName,
      phone: lead.phone,
      email: lead.email,
      propertyType: lead.propertyType,
      transactionType: lead.transactionType,
      addressLine1: lead.addressLine1,
      addressLine2: lead.addressLine2 ?? "",
      postalCode: lead.postalCode ?? "",
      areaM2: lead.areaM2,
      priceKrw: lead.priceKrw,
      depositKrw: lead.depositKrw,
      monthlyRentKrw: lead.monthlyRentKrw,
      moveInDate: lead.moveInDate ?? "",
      contactTime: lead.contactTime ?? "",
      description: lead.description ?? "",
      privacyConsent: lead.privacyConsent,
      marketingConsent: lead.marketingConsent,
      status: nextStatus,
      adminMemo: lead.adminMemo ?? "",
      isPublished: lead.isPublished,
      photos: toLeadPhotoInputs(adminPhotos),
    };
  }

  async function refreshAdminDetail(leadId: number) {
    const [nextListing, nextAdminLead] = await Promise.all([getPublishedListingDetail(leadId), getAdminLeadDetail(leadId)]);
    releaseEditablePhotos(adminPhotosRef.current);
    const nextPhotos = createEditablePhotos(nextAdminLead.photos);
    adminPhotosRef.current = nextPhotos;
    setListing(nextListing);
    setAdminLead(nextAdminLead);
    setAdminPhotos(nextPhotos);
  }

  async function handleAdminPhotoSave() {
    if (listingId == null || !adminLead) {
      return;
    }

    try {
      setIsAdminSaving(true);
      setAdminMessage(null);

      await updateLeadAdminFields(listingId, buildAdminPayload(adminLead));
      await refreshAdminDetail(listingId);
      setAdminMessage("사진 변경을 저장했습니다.");
      setAdminUploadHint(null);
    } catch (saveError) {
      setAdminMessage(saveError instanceof Error ? saveError.message : "사진 저장에 실패했습니다.");
    } finally {
      setIsAdminSaving(false);
    }
  }

  async function handleAdminStatusMove(nextStatus: LeadStatus) {
    if (listingId == null || !adminLead) {
      return;
    }

    try {
      setIsAdminSaving(true);
      setAdminMessage(null);

      await updateLeadAdminFields(listingId, buildAdminPayload(adminLead, nextStatus));
      router.replace(getAdminLeadsPath(nextStatus));
    } catch (saveError) {
      setAdminMessage(saveError instanceof Error ? saveError.message : "상태 변경에 실패했습니다.");
    } finally {
      setIsAdminSaving(false);
    }
  }

  if (session.isLoading || isLoading) {
    return (
      <div className="page-stack">
        <section className="page-panel">
          <span className="eyebrow">상세 보기</span>
          <h1 className="page-title page-title-medium">매물 상세를 불러오고 있어요.</h1>
        </section>
      </div>
    );
  }

  if (listingId == null) {
    return <DetailErrorState title="올바른 매물 주소가 아니에요" message="매물 번호를 다시 확인해 주세요." listingId={listingId} />;
  }

  if (!canReadDetail) {
    return <DetailBlockedState listingId={listingId} />;
  }

  if (errorCode === "REGION_ACCESS_DENIED") {
    return (
      <DetailErrorState
        title="인증한 지역 바깥의 매물이에요"
        message={error ?? "현재 인증한 동네 밖의 매물은 상세 정보를 볼 수 없어요."}
        listingId={listingId}
      />
    );
  }

  if (errorCode === "REGION_VERIFICATION_REQUIRED") {
    return <DetailBlockedState listingId={listingId} />;
  }

  if (error || !listing) {
    return (
      <DetailErrorState
        title="매물 상세를 불러오지 못했어요"
        message={error ?? "잠시 후 다시 시도해 주세요."}
        listingId={listingId}
      />
    );
  }

  return (
    <div className="page-stack">
      <section className="page-panel detail-hero">
        <div>
          <span className="eyebrow">{getTransactionTypeLabel(listing.transactionType)}</span>
          <h1 className="page-title page-title-medium">{listing.listingTitle}</h1>
          <p className="page-copy">
            {listing.region3DepthName ?? "인증 지역"} · {listing.addressLine1}
          </p>
          <div className="detail-highlight-row">
            <strong>{formatTradeLabel(listing)}</strong>
            <span>{getPropertyTypeLabel(listing.propertyType)}</span>
            <span>{formatArea(listing.areaM2)}</span>
            <span>{formatDateTime(listing.createdAt)}</span>
          </div>
        </div>
        <div className="button-row">
          <Link href="/explore" className="button button-secondary">
            목록으로
          </Link>
          {session.kind === "admin" ? (
            <Link href={getAdminLeadsPath(adminLead?.status ?? null)} className="button button-primary">
              매물 관리로
            </Link>
          ) : (
            <button type="button" className="button button-primary" onClick={handleToggleSave}>
              {isSaved ? "저장 해제" : "매물 저장"}
            </button>
          )}
        </div>
      </section>

      <section className="gallery-grid">
        {visiblePhotos.length > 0 ? (
          visiblePhotos.map((photo) =>
            photo.viewUrl ? <img key={photo.id} src={photo.viewUrl} alt={photo.fileName} className="detail-photo" /> : null,
          )
        ) : listing.photos.length > 0 ? (
          <div className="empty-panel">
            <strong>사진 미리보기를 준비하지 못했어요.</strong>
            <p>S3 공개 URL 또는 presigned GET 설정을 확인한 뒤 다시 시도해 주세요.</p>
          </div>
        ) : (
          <div className="empty-panel">
            <strong>등록된 사진이 없어요.</strong>
            <p>기본 정보와 설명은 아래에서 먼저 확인할 수 있습니다.</p>
          </div>
        )}
      </section>

      {session.kind === "admin" ? (
        <section className="page-panel admin-detail-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">관리자 빠른 처리</span>
              <h2 className="section-title">공개 상세에서 바로 사진과 상태 관리</h2>
            </div>

            {adminLead ? (
              <Link href={getAdminLeadsPath(adminLead.status)} className="button button-secondary button-small">
                현재 분류 보기
              </Link>
            ) : null}
          </div>

          {isAdminLoading ? (
            <p className="page-copy compact-copy">관리자 편집 정보를 불러오고 있습니다.</p>
          ) : adminLead ? (
            <>
              <div className="inline-note-list">
                <span className="inline-note">{getStatusLabel(adminLead.status)}</span>
                <span className={`inline-note${adminLead.locationVerified ? " success" : ""}`}>
                  {adminLead.locationVerified ? "위치 인증 완료" : "위치 인증 미완료"}
                </span>
                <span className="inline-note">{adminLead.isPublished ? "공개 중" : "비공개"}</span>
              </div>

              <div className="button-row">
                {leadStatusOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`button button-small ${adminLead.status === option.value ? "button-primary" : "button-secondary"}`}
                    onClick={() => void handleAdminStatusMove(option.value)}
                    disabled={isAdminSaving || isAdminUploading}
                  >
                    {detailStatusActionLabels[option.value]}
                  </button>
                ))}
              </div>

              <section className="admin-form-section">
                <div className="section-heading section-heading-compact">
                  <div>
                    <span className="eyebrow">사진 관리</span>
                    <h3 className="section-title section-title-small">작은 썸네일로 편집</h3>
                  </div>

                  <label className="button button-secondary button-small photo-picker-button">
                    사진 추가
                    <input type="file" accept="image/*" multiple hidden onChange={handleAdminPhotoChange} />
                  </label>
                </div>

                {adminUploadHint ? <div className="success-banner">{adminUploadHint}</div> : null}

                <div className="admin-photo-grid">
                  {adminPhotos.length === 0 ? (
                    <div className="empty-panel">
                      <strong>등록된 사진이 없습니다.</strong>
                      <p>사진을 추가하거나 필요 없는 사진을 지운 뒤 저장해 주세요.</p>
                    </div>
                  ) : (
                    adminPhotos.map((photo) => (
                      <article key={photo.localId} className="admin-photo-card">
                        {photo.previewUrl ? (
                          <img className="admin-photo-thumb" src={photo.previewUrl} alt={photo.fileName} />
                        ) : (
                          <div className="admin-photo-thumb admin-photo-thumb-empty">미리보기 없음</div>
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
                          onClick={() => handleAdminPhotoRemove(photo.localId)}
                        >
                          사진 삭제
                        </button>
                      </article>
                    ))
                  )}
                </div>

                {adminMessage ? <div className="success-banner">{adminMessage}</div> : null}

                <div className="button-row">
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => void handleAdminPhotoSave()}
                    disabled={isAdminSaving || isAdminUploading}
                  >
                    {isAdminSaving ? "저장 중..." : "사진 변경 저장"}
                  </button>
                </div>
              </section>
            </>
          ) : (
            <p className="page-copy compact-copy">{adminMessage ?? "관리자 편집 정보를 찾지 못했습니다."}</p>
          )}
        </section>
      ) : null}

      <section className="detail-grid-shell">
        <div className="detail-card">
          <h2 className="section-title">매물 정보</h2>
          <div className="detail-info-grid">
            <div>
              <span>거래 유형</span>
              <strong>{getTransactionTypeLabel(listing.transactionType)}</strong>
            </div>
            <div>
              <span>매물 유형</span>
              <strong>{getPropertyTypeLabel(listing.propertyType)}</strong>
            </div>
            <div>
              <span>면적</span>
              <strong>{formatArea(listing.areaM2)}</strong>
            </div>
            <div>
              <span>입주 가능 시기</span>
              <strong>{listing.moveInDate || "-"}</strong>
            </div>
            <div>
              <span>연락 가능 시간</span>
              <strong>{listing.contactTime || "-"}</strong>
            </div>
            <div>
              <span>동네</span>
              <strong>{listing.region3DepthName ?? "인증 지역"}</strong>
            </div>
          </div>
        </div>

        <div className="detail-card">
          <h2 className="section-title">상세 설명</h2>
          <p className="page-copy">{listing.description || "등록된 상세 설명이 아직 없습니다."}</p>
        </div>

        <div className="detail-card">
          <h2 className="section-title">연락 정보</h2>
          <div className="detail-info-grid">
            <div>
              <span>중개사무소</span>
              <strong>{listing.officeName}</strong>
            </div>
            <div>
              <span>전화번호</span>
              <strong>{listing.officePhone || "준비 중"}</strong>
            </div>
            <div>
              <span>사무소 주소</span>
              <strong>{listing.officeAddress || "-"}</strong>
            </div>
            <div>
              <span>사진 수</span>
              <strong>{listing.photoCount}장</strong>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
