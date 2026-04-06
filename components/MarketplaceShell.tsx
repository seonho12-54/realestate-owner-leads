"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { KakaoMapPanel } from "@/components/KakaoMapPanel";
import { formatArea, formatTradeLabel, getPropertyTypeLabel, getTransactionTypeLabel } from "@/lib/format";
import type { PublicListing } from "@/lib/leads";
import { propertyTypeOptions, transactionTypeOptions } from "@/lib/validation";

const allTransactionOption = { value: "all", label: "전체 거래" } as const;
const allPropertyOption = { value: "all", label: "전체 유형" } as const;

const heroCategories = [
  {
    id: "studio",
    title: "원/투룸",
    description: "오피스텔, 빌라, 다가구 매물을 한 번에 살펴보세요.",
    propertyFilters: ["officetel", "villa", "house"] as string[],
    accent: "studio",
  },
  {
    id: "apartment",
    title: "아파트",
    description: "실거주 중심 아파트와 신축 단지를 빠르게 모아봅니다.",
    propertyFilters: ["apartment"] as string[],
    accent: "apartment",
  },
  {
    id: "villa",
    title: "주택/빌라",
    description: "다가구, 단독, 빌라 중심으로 동네 흐름을 확인하세요.",
    propertyFilters: ["villa", "house"] as string[],
    accent: "villa",
  },
  {
    id: "officetel",
    title: "오피스텔",
    description: "직주근접형 오피스텔 매물을 지도에서 바로 비교합니다.",
    propertyFilters: ["officetel"] as string[],
    accent: "officetel",
  },
] as const;

type AuthPromptState = {
  title: string;
  description: string;
  nextUrl: string;
} | null;

function getPublicLocationLabel(listing: PublicListing) {
  return listing.region3DepthName ? `${listing.region3DepthName} 인근` : "허용 지역 인근";
}

function getListingHeadline(listing: PublicListing, canUseMemberFeatures: boolean) {
  if (canUseMemberFeatures) {
    return listing.listingTitle;
  }

  return `${getPublicLocationLabel(listing)} ${getPropertyTypeLabel(listing.propertyType)}`;
}

export function MarketplaceShell({
  listings,
  canUseMemberFeatures,
}: {
  listings: PublicListing[];
  canUseMemberFeatures: boolean;
}) {
  const [transactionFilter, setTransactionFilter] = useState<string>("all");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [authPrompt, setAuthPrompt] = useState<AuthPromptState>(null);
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const filteredListings = useMemo(() => {
    const normalizedQuery = deferredSearchTerm.trim().toLowerCase();

    return listings.filter((listing) => {
      if (transactionFilter !== "all" && listing.transactionType !== transactionFilter) {
        return false;
      }

      if (propertyFilter !== "all" && listing.propertyType !== propertyFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        listing.listingTitle,
        listing.region3DepthName,
        listing.description,
        getPropertyTypeLabel(listing.propertyType),
        getTransactionTypeLabel(listing.transactionType),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [deferredSearchTerm, listings, propertyFilter, transactionFilter]);

  const [selectedListingId, setSelectedListingId] = useState<number | null>(filteredListings[0]?.id ?? null);

  useEffect(() => {
    if (filteredListings.length === 0) {
      setSelectedListingId(null);
      return;
    }

    if (!filteredListings.some((listing) => listing.id === selectedListingId)) {
      setSelectedListingId(filteredListings[0]?.id ?? null);
    }
  }, [filteredListings, selectedListingId]);

  const selectedListing = filteredListings.find((listing) => listing.id === selectedListingId) ?? null;

  const stats = useMemo(() => {
    const saleCount = listings.filter((listing) => listing.transactionType === "sale").length;
    const jeonseCount = listings.filter((listing) => listing.transactionType === "jeonse").length;
    const monthlyCount = listings.filter((listing) => listing.transactionType === "monthly").length;

    return { saleCount, jeonseCount, monthlyCount };
  }, [listings]);

  function requireMemberAccess(title: string, description: string, nextUrl = "/") {
    if (canUseMemberFeatures) {
      return false;
    }

    setAuthPrompt({ title, description, nextUrl });
    return true;
  }

  function handleHeroCategoryClick(category: (typeof heroCategories)[number]) {
    if (
      requireMemberAccess(
        `${category.title} 상세 보기는 회원 전용입니다`,
        "회원가입 시 위치 인증을 한 번만 완료하면 매물 상세, 연락처, 등록 기능까지 바로 이용할 수 있어요.",
      )
    ) {
      return;
    }

    setPropertyFilter(category.propertyFilters[0] ?? "all");
  }

  function handleListingAction(listingId: number) {
    if (
      requireMemberAccess(
        "상세 확인은 로그인 후 이용할 수 있어요",
        "비회원은 지도와 동네 흐름만 볼 수 있고, 자세한 사진과 연락 정보는 회원가입 후 열립니다.",
        `/listings/${listingId}`,
      )
    ) {
      return;
    }
  }

  return (
    <div className="market-layout market-layout-home">
      <section className="landing-hero">
        <div className="landing-hero-head">
          <div className="landing-copy">
            <span className="eyebrow">다운동 / 포곡읍 한정</span>
            <h1 className="landing-brand">다우니</h1>
            <p className="landing-copy-text">
              가까운 매물 흐름부터 지도에서 먼저 살펴보고, 마음에 드는 유형은 로그인 후 자세히 확인해 보세요.
            </p>
          </div>
          <div className="button-row">
            <Link href="/sell" className="button button-primary">
              매물 등록
            </Link>
            {!canUseMemberFeatures ? (
              <>
                <Link href="/login" className="button button-secondary">
                  로그인
                </Link>
                <Link href="/signup" className="button button-ghost">
                  회원가입
                </Link>
              </>
            ) : null}
          </div>
        </div>

        <label className="landing-search">
          <span className="landing-search-icon" aria-hidden="true">
            ○
          </span>
          <input
            className="landing-search-input"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="지역, 단지, 학교, 매물 유형으로 먼저 둘러보세요."
          />
        </label>

        <div className="landing-feature-grid">
          <div className="landing-category-grid">
            {heroCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={`landing-category-card ${category.accent}`}
                onClick={() => handleHeroCategoryClick(category)}
              >
                <div className="landing-category-copy">
                  <strong>{category.title}</strong>
                  <p>{category.description}</p>
                </div>
                <span className="landing-category-lock">{canUseMemberFeatures ? "바로 보기" : "회원 전용"}</span>
              </button>
            ))}
          </div>

          <div className="landing-promo-card">
            <div className="landing-promo-main">
              <span className="eyebrow">오늘 공개 중</span>
              <strong>{listings.length}개의 승인 매물</strong>
              <p>지도에서는 정확한 주소 대신 인근 위치와 묶음 클러스터만 먼저 보여드립니다.</p>
            </div>
            <div className="landing-stat-row">
              <div className="landing-stat-card">
                <span>매매</span>
                <strong>{stats.saleCount}</strong>
              </div>
              <div className="landing-stat-card">
                <span>전세</span>
                <strong>{stats.jeonseCount}</strong>
              </div>
              <div className="landing-stat-card">
                <span>월세</span>
                <strong>{stats.monthlyCount}</strong>
              </div>
            </div>
            <div className="landing-promo-note">
              {!canUseMemberFeatures
                ? "카테고리와 상세 보기는 로그인 후 열립니다. 회원가입 단계에서 위치 인증을 한 번만 완료하면 계속 유지됩니다."
                : "회원 상태에서는 상세 사진과 등록 요청, 공개 매물 상세 화면까지 바로 이어집니다."}
            </div>
          </div>
        </div>
      </section>

      <section className="filter-panel landing-filter-panel">
        <div className="filter-group">
          {[allTransactionOption, ...transactionTypeOptions].map((option) => (
            <button
              key={option.value}
              type="button"
              className={`filter-chip${transactionFilter === option.value ? " active" : ""}`}
              onClick={() => setTransactionFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="filter-group">
          {[allPropertyOption, ...propertyTypeOptions].map((option) => (
            <button
              key={option.value}
              type="button"
              className={`filter-chip${propertyFilter === option.value ? " active" : ""}`}
              onClick={() => setPropertyFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        {!canUseMemberFeatures ? (
          <div className="guest-safe-note">
            비회원은 지도와 동네 단위 정보만 볼 수 있어요. 사진, 상세 주소, 연락 정보는 회원가입 후 확인할 수 있습니다.
          </div>
        ) : null}
      </section>

      <section className="market-shell landing-market-shell">
        <div className="listing-column">
          <div className="listing-summary">
            <strong>{filteredListings.length}</strong>
            <span>현재 표시 중인 매물</span>
          </div>

          <div className="listing-grid landing-listing-grid">
            {filteredListings.length === 0 ? (
              <div className="empty-panel">
                <strong>조건에 맞는 매물이 아직 없습니다</strong>
                <p>필터를 바꾸거나 검색어를 지우고 다시 둘러보세요.</p>
              </div>
            ) : null}

            {filteredListings.map((listing) => (
              <article
                key={listing.id}
                className={`listing-card landing-listing-card${selectedListingId === listing.id ? " selected" : ""}`}
                onMouseEnter={() => setSelectedListingId(listing.id)}
              >
                <div className="listing-thumb-wrap">
                  {listing.previewPhotoUrl ? (
                    <img src={listing.previewPhotoUrl} alt={getListingHeadline(listing, canUseMemberFeatures)} className="listing-thumb" />
                  ) : (
                    <div className="listing-thumb empty">사진 준비 중</div>
                  )}
                  <span className="listing-badge">{getTransactionTypeLabel(listing.transactionType)}</span>
                </div>

                <div className="listing-content">
                  <div className="listing-headline">
                    <strong>{formatTradeLabel(listing)}</strong>
                    <span>{formatArea(listing.areaM2)}</span>
                  </div>
                  <h2>{getListingHeadline(listing, canUseMemberFeatures)}</h2>
                  <p className="listing-blurb">
                    {canUseMemberFeatures
                      ? `${listing.region3DepthName ?? "허용 지역"} · ${listing.addressLine1}`
                      : `${getPublicLocationLabel(listing)} · 상세 주소는 회원가입 후 확인`}
                  </p>
                  <div className="listing-meta">
                    <span>{getPropertyTypeLabel(listing.propertyType)}</span>
                    <span>{listing.officeName}</span>
                    <span>사진 {listing.photoCount}장</span>
                  </div>
                  <div className="listing-footer">
                    <span>{canUseMemberFeatures ? "상세 보기 가능" : "로그인 후 상세 열람"}</span>
                    {canUseMemberFeatures ? (
                      <Link href={`/listings/${listing.id}`} className="button button-small button-secondary">
                        상세 보기
                      </Link>
                    ) : (
                      <button type="button" className="button button-small button-secondary" onClick={() => handleListingAction(listing.id)}>
                        로그인 후 보기
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="map-column">
          <div className="map-panel">
            <KakaoMapPanel listings={filteredListings} selectedListingId={selectedListingId} onSelect={setSelectedListingId} />
          </div>
          {selectedListing ? (
            <div className="selected-panel landing-selected-panel">
              <div className="selected-header">
                <div>
                  <strong>{getListingHeadline(selectedListing, canUseMemberFeatures)}</strong>
                  <p>{canUseMemberFeatures ? selectedListing.addressLine1 : `${getPublicLocationLabel(selectedListing)} · 상세 주소 비공개`}</p>
                </div>
                {canUseMemberFeatures ? (
                  <Link href={`/listings/${selectedListing.id}`} className="button button-primary button-small">
                    상세 보기
                  </Link>
                ) : (
                  <button type="button" className="button button-primary button-small" onClick={() => handleListingAction(selectedListing.id)}>
                    로그인 후 보기
                  </button>
                )}
              </div>
              <div className="selected-grid">
                <span>{formatTradeLabel(selectedListing)}</span>
                <span>{formatArea(selectedListing.areaM2)}</span>
                <span>{getPropertyTypeLabel(selectedListing.propertyType)}</span>
                <span>{getPublicLocationLabel(selectedListing)}</span>
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
              <Link href={`/login?next=${encodeURIComponent(authPrompt.nextUrl)}`} className="button button-secondary">
                로그인
              </Link>
              <Link href={`/signup?next=${encodeURIComponent(authPrompt.nextUrl)}`} className="button button-primary">
                회원가입
              </Link>
              <button type="button" className="button button-ghost" onClick={() => setAuthPrompt(null)}>
                나중에
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
