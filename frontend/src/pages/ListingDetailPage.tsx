import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";

import { useSession } from "@/context/SessionContext";
import { formatArea, formatDateTime, formatTradeLabel, getPropertyTypeLabel, getTransactionTypeLabel } from "@/lib/format";
import { getPublishedListingDetail, type LeadDetail } from "@/lib/leads";

export function ListingDetailPage() {
  const { session } = useSession();
  const params = useParams();
  const listingId = Number(params.listingId);
  const [listing, setListing] = useState<LeadDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!Number.isFinite(listingId) || listingId <= 0 || !session.authenticated) {
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
      })
      .catch((loadError) => {
        if (!isMounted) {
          return;
        }

        setListing(null);
        setError(loadError instanceof Error ? loadError.message : "매물 상세를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [listingId, session.authenticated]);

  if (!Number.isFinite(listingId) || listingId <= 0) {
    return <Navigate to="/" replace />;
  }

  if (!session.isLoading && !session.authenticated) {
    return <Navigate to={`/login?next=/listings/${listingId}`} replace />;
  }

  if (isLoading) {
    return (
      <div className="page-stack">
        <section className="page-panel">
          <span className="eyebrow">매물 상세</span>
          <h1 className="page-title page-title-medium">매물 정보를 불러오는 중입니다.</h1>
        </section>
      </div>
    );
  }

  if (!listing || error) {
    return (
      <div className="page-stack">
        <section className="page-panel">
          <span className="eyebrow">불러오기 실패</span>
          <h1 className="page-title page-title-medium">매물 상세를 가져오지 못했습니다.</h1>
          <p className="page-copy compact-copy">{error ?? "해당 매물을 찾을 수 없습니다."}</p>
        </section>
      </div>
    );
  }

  const visiblePhotos = listing.photos.filter((photo) => Boolean(photo.viewUrl));

  return (
    <div className="page-stack">
      <section className="detail-hero">
        <div>
          <span className="eyebrow">{getTransactionTypeLabel(listing.transactionType)}</span>
          <h1 className="page-title page-title-medium">{listing.listingTitle}</h1>
          <p className="page-copy compact-copy">{listing.addressLine1}</p>
        </div>
        <div className="detail-highlight-row">
          <span>{formatTradeLabel(listing)}</span>
          <span>{formatArea(listing.areaM2)}</span>
          <span>{getPropertyTypeLabel(listing.propertyType)}</span>
          <span>{formatDateTime(listing.createdAt)}</span>
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
            <strong>등록된 사진이 없습니다.</strong>
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
              <span>지역</span>
              <strong>{listing.region3DepthName || "허용 지역 인근"}</strong>
            </div>
          </div>
        </div>

        <div className="detail-card">
          <h2 className="section-title">상세 설명</h2>
          <p className="page-copy">{listing.description || "등록된 상세 설명이 없습니다."}</p>
        </div>

        <div className="detail-card">
          <h2 className="section-title">중개사무소</h2>
          <div className="detail-info-grid">
            <div>
              <span>상호명</span>
              <strong>{listing.officeName}</strong>
            </div>
            <div>
              <span>연락처</span>
              <strong>{listing.officePhone || "-"}</strong>
            </div>
            <div>
              <span>사무소 주소</span>
              <strong>{listing.officeAddress || "-"}</strong>
            </div>
          </div>
        </div>
      </section>

      <div className="button-row">
        <Link to="/" className="button button-secondary">
          홈으로
        </Link>
        <Link to="/sell" className="button button-primary">
          매물 접수
        </Link>
      </div>
    </div>
  );
}
