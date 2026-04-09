import { useEffect, useMemo, useState } from "react";

import { KakaoMapPanel } from "@/components/KakaoMapPanel";
import { Link } from "@/components/RouterLink";
import { formatArea, formatDateTime, formatTradeLabel, getPropertyTypeLabel } from "@/lib/format";
import type { PublicListing } from "@/lib/leads";
import { createCompactLocation } from "@/lib/service-area";

type CategoryCard = {
  id: string;
  title: string;
  subtitle: string;
  propertyTypes: string[];
};

const categoryCards: CategoryCard[] = [
  {
    id: "studio",
    title: "원룸 · 투룸",
    subtitle: "오피스텔 / 빌라 / 다가구",
    propertyTypes: ["officetel", "villa", "house"],
  },
  {
    id: "apartment",
    title: "아파트",
    subtitle: "실거주 중심 매물",
    propertyTypes: ["apartment"],
  },
  {
    id: "house",
    title: "주택 · 빌라",
    subtitle: "연립 / 단독 / 다가구",
    propertyTypes: ["villa", "house"],
  },
  {
    id: "business",
    title: "상가 · 사무실",
    subtitle: "업무형 매물",
    propertyTypes: ["commercial", "land", "other"],
  },
] as const;

type CategoryId = CategoryCard["id"] | "all";

type AuthPromptState = {
  title: string;
  description: string;
  nextUrl: string;
} | null;

function matchesCategory(listing: PublicListing, categoryId: CategoryId) {
  if (categoryId === "all") {
    return true;
  }

  const category = categoryCards.find((card) => card.id === categoryId);
  if (!category) {
    return true;
  }

  return category.propertyTypes.includes(listing.propertyType);
}

function getGuestListingTitle(listing: PublicListing) {
  const compactLocation = createCompactLocation(null, listing.region3DepthName);
  return compactLocation ? `${compactLocation} 인근 ${getPropertyTypeLabel(listing.propertyType)}` : getPropertyTypeLabel(listing.propertyType);
}

function getTransactionBadge(transactionType: string) {
  switch (transactionType) {
    case "sale":
      return "매매";
    case "jeonse":
      return "전세";
    case "monthly":
      return "월세";
    default:
      return "상담";
  }
}

export function MarketplaceShell({
  listings,
  canUseMemberFeatures,
}: {
  listings: PublicListing[];
  canUseMemberFeatures: boolean;
}) {
  const safeListings = Array.isArray(listings) ? listings : [];
  const [categoryFilter, setCategoryFilter] = useState<CategoryId>("all");
  const [transactionFilter, setTransactionFilter] = useState<string>("all");
  const [selectedListingId, setSelectedListingId] = useState<number | null>(safeListings[0]?.id ?? null);
  const [authPrompt, setAuthPrompt] = useState<AuthPromptState>(null);

  const filteredListings = useMemo(() => {
    return safeListings.filter((listing) => {
      if (!matchesCategory(listing, categoryFilter)) {
        return false;
      }

      if (transactionFilter !== "all" && listing.transactionType !== transactionFilter) {
        return false;
      }

      return true;
    });
  }, [categoryFilter, safeListings, transactionFilter]);

  useEffect(() => {
    if (!filteredListings.length) {
      setSelectedListingId(null);
      return;
    }

    if (!filteredListings.some((listing) => listing.id === selectedListingId)) {
      setSelectedListingId(filteredListings[0].id);
    }
  }, [filteredListings, selectedListingId]);

  const selectedListing = filteredListings.find((listing) => listing.id === selectedListingId) ?? filteredListings[0] ?? null;

  function openMemberPrompt(nextUrl: string) {
    setAuthPrompt({
      title: "로그인 후 이어서 볼 수 있어요",
      description: "비회원은 공개 지도와 승인된 목록만 볼 수 있고, 상세 정보와 매물 접수는 로그인 후 이용할 수 있습니다.",
      nextUrl,
    });
  }

  function handleCategoryClick(categoryId: CategoryId) {
    setCategoryFilter(categoryId);
  }

  function handleListingAction(listingId: number) {
    if (!canUseMemberFeatures) {
      openMemberPrompt(`/listings/${listingId}`);
      return;
    }

    window.location.assign(`/listings/${listingId}`);
  }

  return (
    <div className="page-stack">
      <section className="page-panel landing-hero">
        <div className="landing-copy">
          <span className="eyebrow">CATEGORY ENTRY</span>
          <h1 className="page-title page-title-medium">관심 매물 유형부터 진입해 보세요</h1>
        </div>

        <div className="landing-category-grid">
          {categoryCards.map((card) => (
            <button
              key={card.id}
              type="button"
              className={`landing-category-card${categoryFilter === card.id ? " active" : ""}`}
              onClick={() => handleCategoryClick(card.id)}
            >
              <span className="landing-category-subtitle">{card.subtitle}</span>
              <strong>{card.title}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="page-panel landing-filter-panel">
        <div className="chip-group">
          <button type="button" className={`chip${categoryFilter === "all" ? " active" : ""}`} onClick={() => setCategoryFilter("all")}>
            전체 유형
          </button>
          {categoryCards.map((card) => (
            <button
              key={card.id}
              type="button"
              className={`chip${categoryFilter === card.id ? " active" : ""}`}
              onClick={() => handleCategoryClick(card.id)}
            >
              {card.title}
            </button>
          ))}
        </div>
      </section>

      <section className="market-shell">
        <div className="listing-column">
          <div className="listing-summary">
            <strong>{filteredListings.length}</strong>
            <span>현재 공개 중인 매물</span>
          </div>

          {filteredListings.length === 0 ? (
            <div className="empty-panel">
              <strong>조건에 맞는 공개 매물이 없습니다.</strong>
              <p>관리자 승인 후 공개된 매물만 홈에 표시됩니다.</p>
            </div>
          ) : (
            <div className="listing-card-grid">
              {filteredListings.map((listing) => (
                <button
                  key={listing.id}
                  type="button"
                  className={`listing-card${selectedListingId === listing.id ? " selected" : ""}`}
                  onClick={() => handleListingAction(listing.id)}
                  onMouseEnter={() => setSelectedListingId(listing.id)}
                >
                  <div className="listing-thumb-wrap">
                    {listing.previewPhotoUrl ? (
                      <img className="listing-thumb" src={listing.previewPhotoUrl} alt={listing.listingTitle} />
                    ) : (
                      <div className="listing-thumb empty">사진 준비 중</div>
                    )}
                    <span className={`listing-badge transaction-${listing.transactionType}`}>{getTransactionBadge(listing.transactionType)}</span>
                  </div>

                  <div className="listing-content">
                    <strong>{canUseMemberFeatures ? listing.listingTitle : getGuestListingTitle(listing)}</strong>
                    <span className="listing-location">{createCompactLocation(null, listing.region3DepthName) || "허용 지역 인근"}</span>
                    <div className="listing-price">{formatTradeLabel(listing)}</div>
                    <div className="listing-meta">
                      <span>{getPropertyTypeLabel(listing.propertyType)}</span>
                      <span>{formatArea(listing.areaM2)}</span>
                      <span>{formatDateTime(listing.createdAt)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className="map-column">
          <div className="map-panel">
            <KakaoMapPanel
              listings={filteredListings}
              selectedListingId={selectedListingId}
              onSelect={setSelectedListingId}
              transactionFilter={transactionFilter}
              onTransactionFilterChange={setTransactionFilter}
            />
          </div>

          {selectedListing ? (
            <div className="selected-panel">
              <div className="selected-header">
                <div>
                  <span className="eyebrow">선택한 매물</span>
                  <strong>{canUseMemberFeatures ? selectedListing.listingTitle : getGuestListingTitle(selectedListing)}</strong>
                </div>
                <span className={`status-badge transaction-${selectedListing.transactionType}`}>{getTransactionBadge(selectedListing.transactionType)}</span>
              </div>

              <div className="selected-grid">
                <span>{formatTradeLabel(selectedListing)}</span>
                <span>{getPropertyTypeLabel(selectedListing.propertyType)}</span>
                <span>{formatArea(selectedListing.areaM2)}</span>
                <span>{createCompactLocation(null, selectedListing.region3DepthName) || "허용 지역 인근"}</span>
              </div>

              <div className="button-row">
                {canUseMemberFeatures ? (
                  <Link href={`/listings/${selectedListing.id}`} className="button button-primary">
                    상세 보기
                  </Link>
                ) : (
                  <button type="button" className="button button-primary" onClick={() => openMemberPrompt(`/listings/${selectedListing.id}`)}>
                    로그인 후 상세 보기
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </aside>
      </section>

      {authPrompt ? (
        <div className="auth-prompt-backdrop" role="presentation" onClick={() => setAuthPrompt(null)}>
          <div className="auth-prompt-dialog" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <span className="eyebrow">회원 전용 기능</span>
            <h2 className="section-title">{authPrompt.title}</h2>
            <p className="page-copy compact-copy">{authPrompt.description}</p>
            <div className="button-row">
              <Link href={`/login?next=${encodeURIComponent(authPrompt.nextUrl)}`} className="button button-primary">
                로그인
              </Link>
              <Link href="/signup?next=%2Fme" className="button button-secondary">
                회원가입
              </Link>
              <button type="button" className="button button-ghost" onClick={() => setAuthPrompt(null)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
