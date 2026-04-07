"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { KakaoMapPanel } from "@/components/KakaoMapPanel";
import { Link } from "@/components/RouterLink";
import { formatArea, formatTradeLabel, getPropertyTypeLabel, getTransactionTypeLabel } from "@/lib/format";
import type { PublicListing } from "@/lib/leads";
import { SERVICE_REGION_LABEL } from "@/lib/service-area";
import { propertyTypeOptions, transactionTypeOptions } from "@/lib/validation";

const allTransactionOption = { value: "all", label: "전체 거래" } as const;
const allPropertyOption = { value: "all", label: "전체 유형" } as const;

const heroCategories = [
  {
    id: "studio",
    icon: "🛏️",
    title: "원/투룸",
    description: "오피스텔, 빌라, 단독주택 계열을 빠르게 모아보고 싶은 사람을 위한 시작점",
    propertyFilters: ["officetel", "villa", "house"] as string[],
  },
  {
    id: "apartment",
    icon: "🏢",
    title: "아파트",
    description: "실거주와 투자 수요가 많은 아파트 매물만 별도 탐색",
    propertyFilters: ["apartment"] as string[],
  },
  {
    id: "villa",
    icon: "🏘️",
    title: "빌라/주택",
    description: "단독, 다가구, 연립 주택을 더 편하게 비교할 수 있는 묶음 보기",
    propertyFilters: ["villa", "house"] as string[],
  },
  {
    id: "commercial",
    icon: "🗝️",
    title: "상가/사무실",
    description: "상권 분위기나 위치 흐름을 먼저 파악하고 싶은 사용자를 위한 카드",
    propertyFilters: ["commercial"] as string[],
  },
] as const;

const quickTags = ["다운동", "포곡읍", "전세", "월세", "아파트", "오피스텔"] as const;

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
  const safeListings = Array.isArray(listings) ? listings : [];
  const [transactionFilter, setTransactionFilter] = useState<string>("all");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [authPrompt, setAuthPrompt] = useState<AuthPromptState>(null);
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const filteredListings = useMemo(() => {
    const normalizedQuery = deferredSearchTerm.trim().toLowerCase();

    return safeListings.filter((listing) => {
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
  }, [deferredSearchTerm, propertyFilter, safeListings, transactionFilter]);

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
  const spotlightListings = filteredListings.slice(0, 4);

  const stats = useMemo(() => {
    const saleCount = safeListings.filter((listing) => listing.transactionType === "sale").length;
    const jeonseCount = safeListings.filter((listing) => listing.transactionType === "jeonse").length;
    const monthlyCount = safeListings.filter((listing) => listing.transactionType === "monthly").length;

    return { saleCount, jeonseCount, monthlyCount };
  }, [safeListings]);

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
        `${category.title} 상세 탐색은 회원 전용입니다`,
        "비회원은 지도와 지역 분위기까지만 볼 수 있어요. 회원가입 후 위치 인증을 마치면 상세 페이지와 접수 기능까지 바로 이어집니다.",
      )
    ) {
      return;
    }

    setPropertyFilter(category.propertyFilters[0] ?? "all");
  }

  function handleListingAction(listingId: number) {
    if (
      requireMemberAccess(
        "상세 페이지는 로그인 후 확인할 수 있어요",
        "비회원은 지도와 지역 단위 매물 흐름만 볼 수 있습니다. 회원가입을 마치면 사진, 가격, 접수 연결까지 이어집니다.",
        `/listings/${listingId}`,
      )
    ) {
      return;
    }
  }

  return (
    <div className="home-shell">
      <section className="home-stage">
        <div className="home-stage-copy">
          <span className="eyebrow">승인형 지역 매물 플랫폼</span>
          <h1 className="home-stage-title">
            다우니에서
            <br />
            지역 매물 흐름을 먼저 보고
            <br />
            필요한 순간에만 가입하세요
          </h1>
          <p className="home-stage-description">
            {SERVICE_REGION_LABEL} 중심으로 운영되는 부동산 접수·공개 플랫폼입니다. 비회원은 지도와 지역 분위기를 먼저 훑어보고,
            회원은 상세 페이지와 매물 접수까지 이어서 사용할 수 있습니다.
          </p>

          <label className="home-search" aria-label="매물 검색">
            <span className="home-search-icon" aria-hidden="true">
              🔎
            </span>
            <input
              className="home-search-input"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="지역, 거래 유형, 매물 특징으로 먼저 분위기를 살펴보세요"
            />
          </label>

          <div className="home-quick-tags">
            {quickTags.map((tag) => (
              <button key={tag} type="button" className="home-quick-tag" onClick={() => setSearchTerm(tag)}>
                #{tag}
              </button>
            ))}
          </div>
        </div>

        <div className="home-stage-sidebar">
          <article className="home-stage-card spotlight">
            <div className="home-section-head compact">
              <div>
                <span className="eyebrow">이번 공개 현황</span>
                <h2>지도에는 승인된 매물만 표시됩니다</h2>
              </div>
            </div>
            <div className="home-stage-stat-grid">
              <div className="home-stage-stat">
                <span>전체 공개</span>
                <strong>{safeListings.length}</strong>
              </div>
              <div className="home-stage-stat">
                <span>매매</span>
                <strong>{stats.saleCount}</strong>
              </div>
              <div className="home-stage-stat">
                <span>전세</span>
                <strong>{stats.jeonseCount}</strong>
              </div>
              <div className="home-stage-stat">
                <span>월세</span>
                <strong>{stats.monthlyCount}</strong>
              </div>
            </div>
            <ul className="home-stage-highlight-list">
              <li>정확한 동·호수와 상세 주소는 회원에게만 노출</li>
              <li>공개 여부는 관리자 승인을 통과한 매물만 반영</li>
              <li>매물 등록은 접수 후 검토를 거쳐 지도에 표시</li>
            </ul>
          </article>

          <article className="home-stage-card membership">
            <span className="eyebrow">{canUseMemberFeatures ? "회원 모드" : "비회원 미리보기"}</span>
            <h2>{canUseMemberFeatures ? "상세 보기와 등록 기능이 열려 있습니다" : "가입 전에도 지도는 둘러볼 수 있어요"}</h2>
            <p>
              {canUseMemberFeatures
                ? "로그인 상태에서는 상세 페이지, 등록 폼, 공개 승인 흐름까지 바로 이어서 사용할 수 있습니다."
                : "원/투룸, 아파트, 빌라 카드나 상세 페이지를 열 때만 로그인 또는 회원가입을 요구합니다."}
            </p>
            <div className="button-row">
              <Link href="/sell" className="button button-primary">
                매물 접수
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
          </article>
        </div>
      </section>

      <section className="home-category-section">
        <div className="home-section-head">
          <div>
            <span className="eyebrow">빠른 진입</span>
            <h2>다방처럼 먼저 카테고리부터 고르고 들어오게 만들었습니다</h2>
          </div>
          <p>회원 전용 상세 기능은 그대로 유지하면서, 첫 화면에서는 탐색의 진입 장벽을 확 낮췄습니다.</p>
        </div>

        <div className="home-category-grid">
          {heroCategories.map((category) => (
            <button key={category.id} type="button" className="home-category-card" onClick={() => handleHeroCategoryClick(category)}>
              <span className="home-category-icon" aria-hidden="true">
                {category.icon}
              </span>
              <div className="home-category-text">
                <strong>{category.title}</strong>
                <p>{category.description}</p>
              </div>
              <span className="home-category-foot">{canUseMemberFeatures ? "바로 보기" : "로그인 후 상세 열기"}</span>
            </button>
          ))}

          <div className="home-benefit-stack">
            <article className="home-benefit-card">
              <span className="eyebrow">서비스 방식</span>
              <strong>집주인 접수 → 관리자 검토 → 공개 승인</strong>
              <p>운영자가 공개 여부를 결정하기 전까지는 지도와 목록에 노출되지 않도록 설계했습니다.</p>
            </article>
            <article className="home-benefit-card accent">
              <span className="eyebrow">공개 범위</span>
              <strong>비회원은 지역 흐름만, 회원은 상세 페이지까지</strong>
              <p>정확한 주소를 바로 노출하지 않고, 회원에게만 좀 더 구체적인 상세 정보를 제공합니다.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="home-featured-section">
        <div className="home-section-head">
          <div>
            <span className="eyebrow">현재 뜨는 매물</span>
            <h2>지금 공개된 매물 중 먼저 살펴볼 카드</h2>
          </div>
          <p>비회원은 지역 단위로, 회원은 카드 클릭 후 상세 페이지에서 더 구체적으로 확인할 수 있습니다.</p>
        </div>

        <div className="home-featured-grid">
          {spotlightListings.length > 0 ? (
            spotlightListings.map((listing) => (
              <article key={listing.id} className="home-featured-card">
                <div className="home-featured-image">
                  {listing.previewPhotoUrl ? (
                    <img src={listing.previewPhotoUrl} alt={getListingHeadline(listing, canUseMemberFeatures)} />
                  ) : (
                    <div className="listing-thumb empty">준비 중</div>
                  )}
                  <span className={`property-chip ${listing.transactionType}`}>{getTransactionTypeLabel(listing.transactionType)}</span>
                </div>
                <div className="home-featured-body">
                  <strong>{formatTradeLabel(listing)}</strong>
                  <h3>{getListingHeadline(listing, canUseMemberFeatures)}</h3>
                  <p>{canUseMemberFeatures ? listing.addressLine1 : `${getPublicLocationLabel(listing)} · 상세 주소 비공개`}</p>
                  <div className="home-featured-meta">
                    <span>{getPropertyTypeLabel(listing.propertyType)}</span>
                    <span>{formatArea(listing.areaM2)}</span>
                    <span>사진 {listing.photoCount}장</span>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-panel">
              <strong>아직 공개된 매물이 없습니다</strong>
              <p>관리자가 승인한 뒤 지도와 목록에 매물이 표시됩니다.</p>
            </div>
          )}
        </div>
      </section>

      <section className="home-browser-section">
        <div className="home-section-head">
          <div>
            <span className="eyebrow">지도 둘러보기</span>
            <h2>지도와 목록을 한 번에 보는 데스크톱 탐색 화면</h2>
          </div>
          <p>지도로 먼저 위치를 파악하고, 목록으로 매물 타입과 가격을 빠르게 비교하세요.</p>
        </div>

        <section className="filter-panel home-filter-panel">
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
        </section>

        <div className="home-browser-grid">
          <div className="home-map-card">
            <KakaoMapPanel listings={filteredListings} selectedListingId={selectedListingId} onSelect={setSelectedListingId} />
          </div>

          <div className="home-list-panel">
            <div className="listing-summary">
              <strong>{filteredListings.length}</strong>
              <span>현재 조건에 맞는 공개 매물</span>
            </div>

            {selectedListing ? (
              <article className="home-selected-card">
                <div>
                  <span className="eyebrow">현재 선택</span>
                  <h3>{getListingHeadline(selectedListing, canUseMemberFeatures)}</h3>
                  <p>{canUseMemberFeatures ? selectedListing.addressLine1 : `${getPublicLocationLabel(selectedListing)} · 상세 주소 비공개`}</p>
                </div>
                <div className="home-selected-meta">
                  <span>{formatTradeLabel(selectedListing)}</span>
                  <span>{formatArea(selectedListing.areaM2)}</span>
                  <span>{getPropertyTypeLabel(selectedListing.propertyType)}</span>
                </div>
                {canUseMemberFeatures ? (
                  <Link href={`/listings/${selectedListing.id}`} className="button button-primary button-small">
                    상세 페이지
                  </Link>
                ) : (
                  <button type="button" className="button button-primary button-small" onClick={() => handleListingAction(selectedListing.id)}>
                    로그인하고 보기
                  </button>
                )}
              </article>
            ) : null}

            <div className="home-list-grid">
              {filteredListings.length === 0 ? (
                <div className="empty-panel">
                  <strong>조건에 맞는 매물이 없습니다</strong>
                  <p>필터를 바꾸거나 검색어를 비우고 다시 확인해 보세요.</p>
                </div>
              ) : null}

              {filteredListings.map((listing) => (
                <article
                  key={listing.id}
                  className={`home-list-card${selectedListingId === listing.id ? " selected" : ""}`}
                  onMouseEnter={() => setSelectedListingId(listing.id)}
                >
                  <div className="home-list-thumb">
                    {listing.previewPhotoUrl ? (
                      <img src={listing.previewPhotoUrl} alt={getListingHeadline(listing, canUseMemberFeatures)} className="listing-thumb" />
                    ) : (
                      <div className="listing-thumb empty">PHOTO</div>
                    )}
                  </div>
                  <div className="home-list-body">
                    <div className="home-list-topline">
                      <span className={`property-chip ${listing.transactionType}`}>{getTransactionTypeLabel(listing.transactionType)}</span>
                      <strong>{formatTradeLabel(listing)}</strong>
                    </div>
                    <h3>{getListingHeadline(listing, canUseMemberFeatures)}</h3>
                    <p>{canUseMemberFeatures ? listing.addressLine1 : `${getPublicLocationLabel(listing)} · 상세 주소 비공개`}</p>
                    <div className="home-list-meta">
                      <span>{getPropertyTypeLabel(listing.propertyType)}</span>
                      <span>{formatArea(listing.areaM2)}</span>
                      <span>{listing.officeName}</span>
                    </div>
                    <div className="home-list-actions">
                      {canUseMemberFeatures ? (
                        <Link href={`/listings/${listing.id}`} className="button button-secondary button-small">
                          상세 보기
                        </Link>
                      ) : (
                        <button type="button" className="button button-secondary button-small" onClick={() => handleListingAction(listing.id)}>
                          로그인 후 보기
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
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
                나중에 할게요
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
