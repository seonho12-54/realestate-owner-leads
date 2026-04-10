import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { Link } from "@/components/RouterLink";
import { useSession } from "@/context/SessionContext";
import { ApiError } from "@/lib/api";
import { formatArea, formatDateTime, formatTradeLabel, getPropertyTypeLabel, getTransactionTypeLabel } from "@/lib/format";
import { getPublishedListingDetail, type LeadDetail } from "@/lib/leads";
import { isSavedListing, pushRecentListing, toggleSavedListing } from "@/lib/listing-prefs";

function DetailBlockedState({ listingId }: { listingId: number | null }) {
  const nextUrl = listingId ? `/listings/${listingId}` : "/";

  return (
    <div className="page-stack">
      <section className="page-panel detail-hero">
        <div>
          <span className="eyebrow">미리보기 상세</span>
          <h1 className="page-title page-title-medium">내 동네 인증 후 실제 상세 정보를 볼 수 있어요</h1>
          <p className="page-copy">
            상세 주소, 연락처, 사진 전체 보기 등 핵심 정보는 지역 인증이 끝난 뒤에만 열립니다. 화면 구조는 먼저 확인하고, 인증 후 다시 들어오면
            실제 데이터를 그대로 이어서 볼 수 있어요.
          </p>
        </div>
        <div className="button-row">
          <Link href="/" className="button button-primary">
            내 동네 인증하러 가기
          </Link>
          <Link href={`/login?next=${encodeURIComponent(nextUrl)}`} className="button button-secondary">
            로그인
          </Link>
        </div>
      </section>

      <section className="gallery-grid">
        <div className="empty-panel">
          <strong>썸네일은 인증 후 공개돼요</strong>
          <p>사진, 상세 주소, 연락처는 인증 지역이 확인되면 보여드립니다.</p>
        </div>
        <div className="empty-panel">
          <strong>가격과 거래 정보 구조 미리보기</strong>
          <p>매매가, 전세가, 월세, 면적 정보는 인증이 끝나면 실제 데이터로 채워져요.</p>
        </div>
        <div className="empty-panel">
          <strong>중개사무소 정보도 함께 확인</strong>
          <p>지역이 잠기면 중개사무소 연락처와 사진 목록까지 바로 이어서 볼 수 있어요.</p>
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
              <span>지역</span>
              <strong>인증한 동네 기준</strong>
            </div>
          </div>
        </div>

        <div className="detail-card">
          <h2 className="section-title">상세 설명</h2>
          <p className="page-copy">매물 설명, 특이사항, 입주 가능 시기, 연락 가능 시간은 지역 인증 후 실제 데이터로 표시됩니다.</p>
        </div>

        <div className="detail-card">
          <h2 className="section-title">연락 정보</h2>
          <p className="page-copy">중개사무소 전화번호와 주소는 인증 지역 내 매물에 한해 공개됩니다.</p>
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
  const [listing, setListing] = useState<LeadDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  const listingId = useMemo(() => {
    const value = Number(listingIdParam);
    return Number.isFinite(value) && value > 0 ? value : null;
  }, [listingIdParam]);

  const canReadDetail = session.kind === "admin" || session.region.locked;
  const visiblePhotos = useMemo(() => listing?.photos.filter((photo) => Boolean(photo.viewUrl)) ?? [], [listing]);

  useEffect(() => {
    if (listingId == null) {
      setListing(null);
      setError("잘못된 매물 주소예요.");
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

  function handleToggleSave() {
    if (listingId == null || session.kind === "admin") {
      return;
    }

    setIsSaved(toggleSavedListing(listingId).includes(listingId));
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
        title="인증한 지역 밖의 매물이에요"
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
            <Link href="/admin/leads" className="button button-primary">
              매물 관리
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
            <strong>사진 미리보기를 준비하지 못했어요</strong>
            <p>S3 공개 URL 또는 presigned GET 설정을 확인한 뒤 다시 시도해 주세요.</p>
          </div>
        ) : (
          <div className="empty-panel">
            <strong>등록된 사진이 없어요</strong>
            <p>기본 정보와 설명은 아래에서 먼저 확인할 수 있어요.</p>
          </div>
        )}
      </section>

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
          <p className="page-copy">{listing.description || "등록된 상세 설명이 아직 없어요."}</p>
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
