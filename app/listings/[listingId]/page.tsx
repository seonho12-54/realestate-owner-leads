import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { LocationGate } from "@/components/LocationGate";
import { formatArea, formatDateTime, formatTradeLabel, getPropertyTypeLabel, getTransactionTypeLabel } from "@/lib/format";
import { getPublishedListingDetail, incrementLeadViewCount } from "@/lib/leads";

export const dynamic = "force-dynamic";

export default async function ListingDetailPage({
  params,
}: {
  params: {
    listingId: string;
  };
}) {
  noStore();

  const listingId = Number(params.listingId);

  if (!Number.isFinite(listingId) || listingId <= 0) {
    notFound();
  }

  const listing = await getPublishedListingDetail(listingId);

  if (!listing) {
    notFound();
  }

  await incrementLeadViewCount(listingId);

  const visiblePhotos = listing.photos.filter((photo) => Boolean(photo.viewUrl));

  return (
    <LocationGate>
      <div className="page-stack">
        <section className="detail-hero">
          <div className="detail-copy">
            <span className="eyebrow">{getTransactionTypeLabel(listing.transactionType)}</span>
            <h1 className="page-title">{listing.listingTitle}</h1>
            <p className="page-copy">{listing.addressLine1}</p>
            <div className="detail-highlight-row">
              <strong>{formatTradeLabel(listing)}</strong>
              <span>{formatArea(listing.areaM2)}</span>
              <span>{getPropertyTypeLabel(listing.propertyType)}</span>
              <span>{formatDateTime(listing.createdAt)}</span>
            </div>
          </div>
          <div className="button-row">
            <Link href="/" className="button button-secondary">
              목록으로
            </Link>
            <Link href="/sell" className="button button-primary">
              비슷한 매물 등록
            </Link>
          </div>
        </section>

        <section className="gallery-grid">
          {visiblePhotos.length > 0 ? (
            visiblePhotos.map((photo) =>
              photo.viewUrl ? <img key={photo.id} src={photo.viewUrl} alt={photo.fileName} className="detail-photo" /> : null,
            )
          ) : listing.photos.length > 0 ? (
            <div className="empty-panel">
              <strong>사진 미리보기를 준비하지 못했습니다</strong>
              <p>S3 설정을 확인한 뒤 다시 시도해 주세요.</p>
            </div>
          ) : (
            <div className="empty-panel">
              <strong>등록된 사진이 없습니다</strong>
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
                <span>입주 가능</span>
                <strong>{listing.moveInDate || "-"}</strong>
              </div>
              <div>
                <span>연락 가능 시간</span>
                <strong>{listing.contactTime || "-"}</strong>
              </div>
              <div>
                <span>지역</span>
                <strong>{listing.region3DepthName || "중구"}</strong>
              </div>
            </div>
          </div>

          <div className="detail-card">
            <h2 className="section-title">설명</h2>
            <p className="page-copy">{listing.description || "등록된 상세 설명이 없습니다."}</p>
          </div>

          <div className="detail-card">
            <h2 className="section-title">연락 정보</h2>
            <div className="detail-info-grid">
              <div>
                <span>중개사무소</span>
                <strong>{listing.officeName}</strong>
              </div>
              <div>
                <span>전화</span>
                <strong>{listing.officePhone || "준비 중"}</strong>
              </div>
              <div>
                <span>사무소 주소</span>
                <strong>{listing.officeAddress || "-"}</strong>
              </div>
            </div>
          </div>
        </section>
      </div>
    </LocationGate>
  );
}
