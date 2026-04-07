"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { KakaoMapPanel } from "@/components/KakaoMapPanel";
import { Link } from "@/components/RouterLink";
import { formatArea, formatDateTime, formatTradeLabel, getPropertyTypeLabel, getTransactionTypeLabel } from "@/lib/format";
import type { PublicListing } from "@/lib/leads";
import { SERVICE_REGION_LABEL } from "@/lib/service-area";
import { propertyTypeOptions, transactionTypeOptions } from "@/lib/validation";

const acquisitionTracks = [
  {
    id: "studio",
    title: "원·투룸",
    subtitle: "주택 / 빌라 / 오피스텔",
    description: "비회원도 흐름은 확인하고, 회원은 상세 열람과 접수까지 이어지는 가장 빠른 진입 카드입니다.",
    propertyFilter: "officetel",
  },
  {
    id: "apartment",
    title: "아파트",
    subtitle: "거주 수요 집중",
    description: "실거주 중심 매물을 빠르게 훑고, 승인된 카드만 지도와 리스트에서 탐색할 수 있습니다.",
    propertyFilter: "apartment",
  },
  {
    id: "villa",
    title: "주택 / 빌라",
    subtitle: "다가구 / 연립 / 단독",
    description: "저층 주거형 매물을 한 번에 묶어보고, 상세 확인은 로그인 후 진행하는 영역입니다.",
    propertyFilter: "villa",
  },
  {
    id: "commercial",
    title: "상가 / 사무실",
    subtitle: "임대 · 매매 동시 확인",
    description: "업무형 매물을 거래 유형별로 살펴보고, 검토 완료된 항목만 노출하는 전용 트랙입니다.",
    propertyFilter: "commercial",
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

function getEstimatedValue(listing: PublicListing) {
  if (listing.transactionType === "sale") {
    return listing.priceKrw ?? 0;
  }

  if (listing.transactionType === "jeonse") {
    return listing.depositKrw ?? 0;
  }

  return (listing.depositKrw ?? 0) + (listing.monthlyRentKrw ?? 0) * 24;
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

  const selectedListing = filteredListings.find((listing) => listing.id === selectedListingId) ?? filteredListings[0] ?? null;

  const recentCount = useMemo(() => {
    const now = Date.now();
    return safeListings.filter((listing) => now - new Date(listing.createdAt).getTime() <= 1000 * 60 * 60 * 24).length;
  }, [safeListings]);

  const potentialEquity = useMemo(
    () => safeListings.reduce((sum, listing) => sum + getEstimatedValue(listing), 0),
    [safeListings],
  );

  const completionRate = safeListings.length === 0 ? 0 : Math.round((safeListings.filter((listing) => listing.photoCount > 0).length / safeListings.length) * 100);

  function requireMemberAccess(title: string, description: string, nextUrl = "/") {
    if (canUseMemberFeatures) {
      return false;
    }

    setAuthPrompt({ title, description, nextUrl });
    return true;
  }

  function handleTrackClick(propertyValue: string) {
    if (
      requireMemberAccess(
        "상세 탐색은 회원 로그인 후 사용할 수 있습니다.",
        "비회원은 지도와 승인된 목록만 미리 볼 수 있고, 상세 페이지 열람과 접수는 로그인 이후부터 열립니다.",
      )
    ) {
      return;
    }

    setPropertyFilter(propertyValue);
  }

  function handleRowAction(listingId: number) {
    if (
      requireMemberAccess(
        "상세 페이지는 로그인 후 확인할 수 있습니다.",
        "비회원은 지역 단위 정보만 미리 볼 수 있습니다. 회원가입 후에는 상세 주소와 사진, 접수 흐름까지 확인할 수 있습니다.",
        `/listings/${listingId}`,
      )
    ) {
      return;
    }
  }

  return (
    <div className="dashboard-home">
      <section className="stitch-hero-grid">
        <div className="stitch-hero-card">
          <span className="stitch-panel-kicker">Curated Intake Platform</span>
          <h1>승인형 매물 접수와 공개 탐색을 한 화면에서 관리합니다.</h1>
          <p>
            {SERVICE_REGION_LABEL} 중심으로 운영되는 접수형 플랫폼입니다. 비회원은 공개 목록과 지도 흐름을 확인하고, 회원은 상세 열람과 접수까지 이어집니다.
          </p>
          <div className="button-row">
            <Link href="/sell" className="button button-primary">
              매물 접수 시작
            </Link>
            {!canUseMemberFeatures ? (
              <Link href="/login" className="button button-secondary">
                회원 로그인
              </Link>
            ) : null}
          </div>
        </div>

        <div className="stitch-intel-card">
          <div className="stitch-panel-header compact">
            <div>
              <span className="stitch-panel-kicker">Recent Intel</span>
              <h2>운영 메모</h2>
            </div>
            <span className="stitch-live-chip">LIVE</span>
          </div>
          <ul className="stitch-feed-list">
            <li>관리자 승인 완료 매물만 지도와 공개 목록에 노출됩니다.</li>
            <li>비회원에게는 정확한 주소 대신 지역 단위 정보만 공개됩니다.</li>
            <li>회원가입 후에는 상세 열람, 접수, 결과 확인이 모두 이어집니다.</li>
          </ul>
          <div className="stitch-intel-block">
            <strong>{canUseMemberFeatures ? "회원 기능이 활성화된 상태입니다." : "비회원 모드로 공개 정보만 열람 중입니다."}</strong>
            <p>
              {canUseMemberFeatures
                ? "상세 페이지 진입, 접수 폼 작성, 결과 확인까지 바로 진행할 수 있습니다."
                : "카테고리 선택이나 상세 열람을 누르면 로그인 또는 회원가입으로 이어집니다."}
            </p>
          </div>
        </div>
      </section>

      <section className="stitch-metrics-grid">
        <article className="stitch-metric-card">
          <span>TOTAL LEADS</span>
          <strong>{safeListings.length.toLocaleString("ko-KR")}</strong>
          <p>현재 승인 후 공개 중인 매물 수</p>
        </article>
        <article className="stitch-metric-card">
          <span>NEW LEADS (24H)</span>
          <strong>{recentCount.toLocaleString("ko-KR")}</strong>
          <p>최근 24시간 내 반영된 목록</p>
        </article>
        <article className="stitch-metric-card emphasis">
          <span>POTENTIAL VALUE</span>
          <strong>{potentialEquity > 0 ? `${Math.round(potentialEquity / 100000000).toLocaleString("ko-KR")}억` : "-"}</strong>
          <p>거래 유형 기준 추정 총액</p>
        </article>
        <article className="stitch-metric-card">
          <span>TASK COMPLETION</span>
          <strong>{completionRate}%</strong>
          <p>사진 등록이 끝난 공개 매물 비율</p>
        </article>
      </section>

      <section className="stitch-dual-grid">
        <div className="stitch-data-panel">
          <div className="stitch-panel-header">
            <div>
              <span className="stitch-panel-kicker">Category Entry</span>
              <h2>관심 매물 유형부터 진입해 보세요.</h2>
            </div>
            <p>다방식 랜딩 흐름처럼 카테고리 단위로 먼저 입구를 제공합니다.</p>
          </div>

          <div className="quick-track-grid">
            {acquisitionTracks.map((track) => (
              <button key={track.id} type="button" className="quick-track-card" onClick={() => handleTrackClick(track.propertyFilter)}>
                <span className="quick-track-badge">{track.subtitle}</span>
                <strong>{track.title}</strong>
                <p>{track.description}</p>
                <span className="quick-track-foot">{canUseMemberFeatures ? "필터 바로 적용" : "로그인 후 상세 보기"}</span>
              </button>
            ))}
          </div>
        </div>

        <aside className="stitch-side-panel">
          <div className="stitch-panel-header compact">
            <div>
              <span className="stitch-panel-kicker">Membership Flow</span>
              <h2>회원 전용 기능</h2>
            </div>
          </div>
          <div className="stitch-side-stack">
            <div className="stitch-side-item">
              <strong>비회원</strong>
              <p>지도, 승인된 목록, 거래 유형별 흐름 확인</p>
            </div>
            <div className="stitch-side-item">
              <strong>회원</strong>
              <p>상세 페이지, 매물 접수, 결과 확인, 저장된 위치 인증 사용</p>
            </div>
            <div className="stitch-side-item">
              <strong>관리자</strong>
              <p>검토 상태 변경, 공개 전환, 메모 기록, 접수 전체 관리</p>
            </div>
          </div>
        </aside>
      </section>

      <section className="stitch-data-panel">
        <div className="stitch-panel-toolbar">
          <div className="stitch-toolbar-tabs">
            <button type="button" className={`stitch-toolbar-tab${transactionFilter === "all" ? " active" : ""}`} onClick={() => setTransactionFilter("all")}>
              전체
            </button>
            {transactionTypeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`stitch-toolbar-tab${transactionFilter === option.value ? " active" : ""}`}
                onClick={() => setTransactionFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="stitch-toolbar-actions">
            <label className="stitch-inline-search">
              <span>⌕</span>
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="주소, 동 이름, 매물명으로 검색" />
            </label>
            <select className="stitch-select" value={propertyFilter} onChange={(event) => setPropertyFilter(event.target.value)}>
              <option value="all">전체 유형</option>
              {propertyTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="stitch-table-shell">
          <div className="stitch-table-head">
            <span>Lead</span>
            <span>지역</span>
            <span>거래 정보</span>
            <span>유형</span>
            <span>등록일</span>
          </div>

          {filteredListings.length === 0 ? (
            <div className="stitch-empty-state">
              <strong>조건에 맞는 매물이 없습니다.</strong>
              <p>거래 유형이나 검색어를 조정한 뒤 다시 확인해 주세요.</p>
            </div>
          ) : (
            filteredListings.map((listing) => (
              <button
                key={listing.id}
                type="button"
                className={`stitch-table-row${selectedListingId === listing.id ? " active" : ""}`}
                onMouseEnter={() => setSelectedListingId(listing.id)}
                onClick={() => {
                  setSelectedListingId(listing.id);
                  handleRowAction(listing.id);
                }}
              >
                <span className="stitch-lead-cell stitch-lead-title">
                  <span className="stitch-avatar">{listing.listingTitle.slice(0, 2).toUpperCase()}</span>
                  <span>
                    <strong>{getListingHeadline(listing, canUseMemberFeatures)}</strong>
                    <small>{listing.officeName}</small>
                  </span>
                </span>
                <span className="stitch-lead-address">{canUseMemberFeatures ? listing.addressLine1 : `${getPublicLocationLabel(listing)} · 상세 주소 비공개`}</span>
                <span className="stitch-lead-value">{formatTradeLabel(listing)}</span>
                <span className={`stitch-status-chip ${listing.transactionType}`}>{getTransactionTypeLabel(listing.transactionType)}</span>
                <span className="stitch-lead-date">{formatDateTime(listing.createdAt)}</span>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="stitch-bottom-grid">
        <div className="stitch-map-card">
          <div className="stitch-panel-header compact">
            <div>
              <span className="stitch-panel-kicker">Map Intelligence</span>
              <h2>가까운 매물은 클러스터로 묶어 보여줍니다.</h2>
            </div>
            <p>정확한 좌표와 주소는 숨기고, 인근 단위 흐름만 탐색할 수 있습니다.</p>
          </div>
          <KakaoMapPanel
            listings={filteredListings}
            selectedListingId={selectedListingId}
            onSelect={setSelectedListingId}
            transactionFilter={transactionFilter}
            onTransactionFilterChange={setTransactionFilter}
          />
        </div>

        <aside className="stitch-selected-card">
          {selectedListing ? (
            <>
              <div className="stitch-panel-header compact">
                <div>
                  <span className="stitch-panel-kicker">Selected Lead</span>
                  <h2>{getListingHeadline(selectedListing, canUseMemberFeatures)}</h2>
                </div>
                <span className={`stitch-status-chip ${selectedListing.transactionType}`}>{getTransactionTypeLabel(selectedListing.transactionType)}</span>
              </div>

              {selectedListing.previewPhotoUrl ? (
                <img src={selectedListing.previewPhotoUrl} alt={getListingHeadline(selectedListing, canUseMemberFeatures)} className="stitch-selected-image" />
              ) : (
                <div className="stitch-image-fallback">NO PHOTO</div>
              )}

              <div className="stitch-selected-meta">
                <span>{formatTradeLabel(selectedListing)}</span>
                <span>{formatArea(selectedListing.areaM2)}</span>
                <span>{getPropertyTypeLabel(selectedListing.propertyType)}</span>
              </div>
              <p>{canUseMemberFeatures ? selectedListing.addressLine1 : `${getPublicLocationLabel(selectedListing)} 기준으로만 공개됩니다.`}</p>
              <div className="stitch-side-stack compact">
                <div className="stitch-side-item">
                  <strong>소속 중개사무소</strong>
                  <p>{selectedListing.officeName}</p>
                </div>
                <div className="stitch-side-item">
                  <strong>등록 시점</strong>
                  <p>{formatDateTime(selectedListing.createdAt)}</p>
                </div>
              </div>
              <div className="button-row">
                {canUseMemberFeatures ? (
                  <Link href={`/listings/${selectedListing.id}`} className="button button-primary button-small">
                    상세 페이지
                  </Link>
                ) : (
                  <button type="button" className="button button-primary button-small" onClick={() => handleRowAction(selectedListing.id)}>
                    로그인 후 보기
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="stitch-empty-state compact">
              <strong>선택된 매물이 없습니다.</strong>
              <p>목록이나 지도에서 항목을 선택하면 요약 카드가 채워집니다.</p>
            </div>
          )}
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
                공개 화면으로 돌아가기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
