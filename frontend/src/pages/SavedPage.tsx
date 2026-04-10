import { useEffect, useMemo, useState } from "react";

import { Link } from "@/components/RouterLink";
import { useSession } from "@/context/SessionContext";
import { formatArea, formatTradeLabel, getPropertyTypeLabel } from "@/lib/format";
import { readRecentListingIds, readSavedListingIds } from "@/lib/listing-prefs";
import { listPublishedListings, type PublicListing } from "@/lib/leads";

export function SavedPage() {
  const { session } = useSession();
  const [listings, setListings] = useState<PublicListing[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session.region.locked) {
      setListings([]);
      setError(null);
      return;
    }

    let isMounted = true;

    listPublishedListings()
      .then((response) => {
        if (!isMounted) {
          return;
        }
        setListings(response);
        setError(null);
      })
      .catch((loadError) => {
        if (!isMounted) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "저장한 매물을 불러오지 못했어요.");
      });

    return () => {
      isMounted = false;
    };
  }, [session.region.locked]);

  const savedIds = readSavedListingIds();
  const recentIds = readRecentListingIds();

  const savedListings = useMemo(() => listings.filter((listing) => savedIds.includes(listing.id)), [listings, savedIds]);
  const recentListings = useMemo(() => recentIds.map((id) => listings.find((listing) => listing.id === id)).filter(Boolean) as PublicListing[], [listings, recentIds]);

  if (error) {
    return (
      <div className="page-stack">
        <section className="page-panel">
          <span className="eyebrow">저장/최근</span>
          <h1 className="page-title page-title-medium">목록을 불러오지 못했어요.</h1>
          <p className="page-copy compact-copy">{error}</p>
        </section>
      </div>
    );
  }

  if (!session.region.locked) {
    return (
      <div className="page-stack">
        <section className="locked-state-card">
          <span className="eyebrow">저장/최근</span>
          <h1 className="page-title page-title-medium">지역 인증 후 저장한 매물을 관리할 수 있어요</h1>
          <p className="page-copy">내 동네 인증을 완료하면 실제 저장 매물과 최근 본 매물을 여기에서 다시 볼 수 있어요.</p>
          <div className="button-row">
            <Link href="/" className="button button-primary">
              홈으로 가기
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <span className="eyebrow">저장/최근</span>
          <h1 className="page-title page-title-medium">찜한 매물과 최근 본 매물을 다시 모아봤어요</h1>
          <p className="page-copy">상세 화면에서 저장한 매물과 최근 본 매물을 한곳에서 다시 비교할 수 있어요.</p>
        </div>
      </section>

      <section className="saved-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">찜한 매물</span>
            <h2 className="section-title">저장해 둔 후보</h2>
          </div>
        </div>
        {savedListings.length === 0 ? (
          <div className="empty-panel">
            <strong>아직 저장한 매물이 없어요.</strong>
            <p>둘러보기에서 마음에 드는 매물을 저장해보세요.</p>
          </div>
        ) : (
          <div className="saved-card-grid">
            {savedListings.map((listing) => (
              <Link key={listing.id} href={`/listings/${listing.id}`} className="saved-card">
                <strong>{listing.listingTitle}</strong>
                <span>{formatTradeLabel(listing)}</span>
                <span>{getPropertyTypeLabel(listing.propertyType)}</span>
                <span>{formatArea(listing.areaM2)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="saved-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">최근 본 매물</span>
            <h2 className="section-title">다시 확인하기</h2>
          </div>
        </div>
        {recentListings.length === 0 ? (
          <div className="empty-panel">
            <strong>최근 본 매물이 아직 없어요.</strong>
            <p>상세 화면을 열어보면 여기에 자동으로 쌓여요.</p>
          </div>
        ) : (
          <div className="saved-card-grid">
            {recentListings.map((listing) => (
              <Link key={listing.id} href={`/listings/${listing.id}`} className="saved-card">
                <strong>{listing.listingTitle}</strong>
                <span>{formatTradeLabel(listing)}</span>
                <span>{listing.region3DepthName ?? "우리 동네"}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
