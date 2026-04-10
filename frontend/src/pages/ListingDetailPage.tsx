import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";

import { useSession } from "@/context/SessionContext";
import { ApiError } from "@/lib/api";
import { formatArea, formatTradeLabel, getPropertyTypeLabel, getTransactionTypeLabel } from "@/lib/format";
import { isSavedListing, pushRecentListing, toggleSavedListing } from "@/lib/listing-prefs";
import { getPublishedListingDetail, type LeadDetail } from "@/lib/leads";

export function ListingDetailPage() {
  const { session } = useSession();
  const params = useParams();
  const listingId = Number(params.listingId);
  const [listing, setListing] = useState<LeadDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    setIsSaved(isSavedListing(listingId));
  }, [listingId]);

  useEffect(() => {
    if (!Number.isFinite(listingId) || listingId <= 0) {
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
        pushRecentListing(response.id);
      })
      .catch((loadError) => {
        if (!isMounted) {
          return;
        }
        setListing(null);
        setError(loadError instanceof Error ? loadError.message : "매물 상세를 불러오지 못했어요.");
        setErrorCode(loadError instanceof ApiError ? loadError.code : null);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [listingId]);

  if (!Number.isFinite(listingId) || listingId <= 0) {
    return <Navigate to="/" replace />;
  }

  if (isLoading || session.isLoading) {
    return (
      <div className="page-stack">
        <section className="page-panel">
          <span className="eyebrow">상세 보기</span>
          <h1 className="page-title page-title-medium">매물 정보를 불러오고 있어요.</h1>
        </section>
      </div>
    );
  }

  if (errorCode === "REGION_VERIFICATION_REQUIRED") {
    return (
      <div className="page-stack">
        <section className="locked-state-card">
          <span className="eyebrow">지역 인증 필요</span>
          <h1 className="page-title page-title-medium">매물 상세는 지역 인증 후에만 열 수 있어요</h1>
          <p className="page-copy">홈에서 내 동네 인증을 완료하면 인증한 지역의 매물만 안전하게 확인할 수 있어요.</p>
          <div className="button-row">
            <Link to="/" className="button button-primary">
              홈으로 가기
            </Link>
            <Link to="/login" className="button button-secondary">
              로그인
            </Link>
          </div>
        </section>
      </div>
    );
  }

  if (errorCode === "REGION_ACCESS_DENIED") {
    return (
      <div className="page-stack">
        <section className="locked-state-card">
          <span className="eyebrow">지역 잠금</span>
          <h1 className="page-title page-title-medium">인증한 지역 밖의 매물은 볼 수 없어요</h1>
          <p className="page-copy">내 동네 인증은 한 지역만 잠금돼요. 다른 지역으로 바꾸려면 설정에서 다시 인증을 진행해주세요.</p>
          <div className="button-row">
            <Link to="/explore" className="button button-primary">
              우리 동네 둘러보기
            </Link>
            <Link to="/me" className="button button-secondary">
              설정으로 가기
            </Link>
          </div>
        </section>
      </div>
    );
  }

  if (!listing || error) {
    return (
      <div className="page-stack">
        <section className="page-panel">
          <span className="eyebrow">불러오기 실패</span>
          <h1 className="page-title page-title-medium">매물 상세를 가져오지 못했어요.</h1>
          <p className="page-copy compact-copy">{error ?? "해당 매물을 찾을 수 없어요."}</p>
        </section>
      </div>
    );
  }

  const visiblePhotos = listing.photos.filter((photo) => Boolean(photo.viewUrl));

  return (
    <div className="page-stack">
      <section className="detail-hero detail-hero-clean">
        <div>
          <span className="eyebrow">{getTransactionTypeLabel(listing.transactionType)}</span>
          <h1 className="page-title page-title-medium">{listing.listingTitle}</h1>
          <p className="page-copy compact-copy">{listing.addressLine1}</p>
        </div>
        <div className="detail-highlight-row">
          <span>{formatTradeLabel(listing)}</span>
          <span>{formatArea(listing.areaM2)}</span>
          <span>{getPropertyTypeLabel(listing.propertyType)}</span>
          <button type="button" className="button button-secondary button-small" onClick={() => setIsSaved(toggleSavedListing(listing.id).includes(listing.id))}>
            {isSaved ? "저장 해제" : "저장"}
          </button>
        </div>
      </section>

      <section className="page-panel">
        {visiblePhotos.length > 0 ? (
          <div className="gallery-grid">
            {visiblePhotos.map((photo) =>
              photo.viewUrl ? <img key={photo.id} src={photo.viewUrl} alt={photo.fileName} className="detail-photo" /> : null,
            )}
          </div>
        ) : (
          <div className="empty-panel">
            <strong>등록된 사진이 아직 없어요.</strong>
          </div>
        )}
      </section>

      <section className="detail-grid-shell">
        <div className="detail-card">
          <h2 className="section-title">핵심 정보</h2>
          <div className="detail-info-grid">
            <div>
              <span>거래 방식</span>
              <strong>{getTransactionTypeLabel(listing.transactionType)}</strong>
            </div>
            <div>
              <span>가격</span>
              <strong>{formatTradeLabel(listing)}</strong>
            </div>
            <div>
              <span>면적</span>
              <strong>{formatArea(listing.areaM2)}</strong>
            </div>
            <div>
              <span>매물 유형</span>
              <strong>{getPropertyTypeLabel(listing.propertyType)}</strong>
            </div>
            <div>
              <span>동네</span>
              <strong>{listing.region3DepthName ?? "-"}</strong>
            </div>
            <div>
              <span>입주 가능일</span>
              <strong>{listing.moveInDate ?? "-"}</strong>
            </div>
          </div>
        </div>

        <div className="detail-card">
          <h2 className="section-title">상세 설명</h2>
          <p className="page-copy">{listing.description || "등록된 상세 설명이 아직 없어요."}</p>
        </div>

        <div className="detail-card">
          <h2 className="section-title">문의 정보</h2>
          <div className="detail-info-grid">
            <div>
              <span>중개사무소</span>
              <strong>{listing.officeName}</strong>
            </div>
            <div>
              <span>연락처</span>
              <strong>{listing.officePhone || "-"}</strong>
            </div>
            <div>
              <span>주소</span>
              <strong>{listing.officeAddress || "-"}</strong>
            </div>
            <div>
              <span>연락 가능 시간</span>
              <strong>{listing.contactTime || "-"}</strong>
            </div>
          </div>
        </div>
      </section>

      <div className="button-row">
        <Link to="/explore" className="button button-secondary">
          목록으로 돌아가기
        </Link>
        <Link to="/saved" className="button button-primary">
          저장한 매물 보기
        </Link>
      </div>
    </div>
  );
}
