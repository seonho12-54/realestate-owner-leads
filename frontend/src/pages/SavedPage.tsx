import { useEffect, useMemo, useState } from "react";

import { Link } from "@/components/RouterLink";
import { useSession } from "@/context/SessionContext";
import { formatArea, formatTradeLabel, getPropertyTypeLabel } from "@/lib/format";
import { readRecentListingIds, readSavedListingIds } from "@/lib/listing-prefs";
import { listPublishedListings, type PublicListing } from "@/lib/leads";

const TAB_OPTIONS = [
  { key: "saved", label: "❤️ 찜한 매물" },
  { key: "recent", label: "🕐 최근 본 매물" },
];

export function SavedPage() {
  const { session } = useSession();
  const [listings, setListings] = useState<PublicListing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"saved" | "recent">("saved");

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
        setError(loadError instanceof Error ? loadError.message : "찜한 매물을 불러오지 못했어요.");
      });

    return () => {
      isMounted = false;
    };
  }, [session.region.locked]);

  const savedIds = readSavedListingIds();
  const recentIds = readRecentListingIds();

  const savedListings = useMemo(() => listings.filter((listing) => savedIds.includes(listing.id)), [listings, savedIds]);
  const recentListings = useMemo(
    () => recentIds.map((id) => listings.find((listing) => listing.id === id)).filter(Boolean) as PublicListing[],
    [listings, recentIds],
  );

  if (error) {
    return (
      <div className="page-stack">
        <section className="page-panel">
          <span className="eyebrow">찜 / 최근</span>
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
          <span className="eyebrow">❤️ 찜한 매물</span>
          <h1 className="page-title page-title-medium">지역 인증 후 찜한 매물을 관리할 수 있어요</h1>
          <p className="page-copy">내 동네 인증을 완료하면 찜하기를 눌렀던 매물과 최근 본 매물을 여기에서 다시 볼 수 있어요.</p>
          <div className="button-row" style={{ marginTop: 4 }}>
            <Link href="/" className="button button-primary">
              홈에서 인증하기
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const currentList = activeTab === "saved" ? savedListings : recentListings;

  return (
    <div className="page-stack">
      {/* Hero */}
      <section className="hero-card">
        <div>
          <span className="eyebrow">❤️ 찜 · 최근 본 매물</span>
          <h1 className="page-title page-title-medium">찜한 매물과 최근 본 매물을 다시 모아봤어요</h1>
          <p className="page-copy">
            둘러보기에서 찜하기를 누른 매물과 최근에 확인한 매물을 한곳에서 비교할 수 있어요.
          </p>
        </div>
        <div className="hero-region-card">
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--muted)" }}>요약</span>
          <strong style={{ color: "var(--primary)", fontSize: "1.1rem" }}>
            찜 {savedListings.length}개 · 최근 {recentListings.length}개
          </strong>
          <p>찜한 매물은 설정 메뉴에서도 확인할 수 있어요.</p>
        </div>
      </section>

      {/* Tab selector */}
      <div className="chip-group">
        {TAB_OPTIONS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`chip${activeTab === tab.key ? " active" : ""}`}
            onClick={() => setActiveTab(tab.key as "saved" | "recent")}
            style={{ height: 48, fontSize: "0.96rem", fontWeight: activeTab === tab.key ? 800 : 600 }}
          >
            {tab.label}
            {tab.key === "saved" && (
              <span
                style={{
                  marginLeft: 6,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: activeTab === "saved" ? "var(--primary)" : "rgba(26,58,110,0.1)",
                  color: activeTab === "saved" ? "#fff" : "var(--primary)",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                }}
              >
                {savedListings.length}
              </span>
            )}
            {tab.key === "recent" && (
              <span
                style={{
                  marginLeft: 6,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: activeTab === "recent" ? "var(--primary)" : "rgba(26,58,110,0.1)",
                  color: activeTab === "recent" ? "#fff" : "var(--primary)",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                }}
              >
                {recentListings.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <section className="saved-section">
        {currentList.length === 0 ? (
          <div className="empty-panel">
            {activeTab === "saved" ? (
              <>
                <strong>❤️ 아직 찜한 매물이 없어요</strong>
                <p>둘러보기에서 찜하기를 누르면 여기에 모아 보여드려요.</p>
                <Link href="/explore" className="button button-primary button-small" style={{ marginTop: 8, justifySelf: "center" }}>
                  매물 둘러보러 가기
                </Link>
              </>
            ) : (
              <>
                <strong>🕐 최근 본 매물이 아직 없어요</strong>
                <p>상세 화면을 열어보면 여기에 자동으로 쌓여요.</p>
                <Link href="/explore" className="button button-primary button-small" style={{ marginTop: 8, justifySelf: "center" }}>
                  매물 둘러보러 가기
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="saved-card-grid">
            {currentList.map((listing) => (
              <Link key={listing.id} href={`/listings/${listing.id}`} className="saved-card">
                {listing.previewPhotoUrl && (
                  <img
                    src={listing.previewPhotoUrl}
                    alt={listing.listingTitle}
                    style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", borderRadius: 12 }}
                  />
                )}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span className={`listing-badge transaction-${listing.transactionType}`} style={{ position: "static" }}>
                    {listing.transactionType === "sale" ? "매매" : listing.transactionType === "jeonse" ? "전세" : "월세"}
                  </span>
                  <span className="preview-badge">{getPropertyTypeLabel(listing.propertyType)}</span>
                </div>
                <strong>{listing.listingTitle}</strong>
                <span style={{ fontWeight: 800, color: "var(--primary)", fontSize: "1rem" }}>{formatTradeLabel(listing)}</span>
                <span>📍 {listing.region3DepthName ?? "인증 지역"} · {formatArea(listing.areaM2)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
