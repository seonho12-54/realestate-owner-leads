"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { KakaoMapPanel } from "@/components/KakaoMapPanel";
import { formatArea, formatDateTime, formatTradeLabel, getPropertyTypeLabel, getTransactionTypeLabel } from "@/lib/format";
import type { PublicListing } from "@/lib/leads";
import { propertyTypeOptions, transactionTypeOptions } from "@/lib/validation";

const allTransactionOption = { value: "all", label: "전체 거래" } as const;
const allPropertyOption = { value: "all", label: "전체 유형" } as const;

export function MarketplaceShell({
  listings,
  isLoggedIn,
}: {
  listings: PublicListing[];
  isLoggedIn: boolean;
}) {
  const [transactionFilter, setTransactionFilter] = useState<string>("all");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
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
        listing.addressLine1,
        listing.addressLine2,
        listing.region3DepthName,
        listing.description,
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

  return (
    <div className="market-layout">
      <section className="hero-panel compact market-intro">
        <div className="market-intro-copy">
          <span className="eyebrow">울산광역시 중구 한정</span>
          <h1 className="market-brand-title">다우니</h1>
          <p className="market-brand-note">확인된 위치에서만 열리는 동네 매물 지도</p>
        </div>
        <div className="button-row">
          <Link href="/sell" className="button button-primary">
            매물 등록
          </Link>
          {!isLoggedIn ? (
            <>
              <Link href="/login?next=/sell" className="button button-secondary">
                로그인
              </Link>
              <Link href="/signup?next=/sell" className="button button-ghost">
                회원가입
              </Link>
            </>
          ) : null}
        </div>
      </section>

      <section className="filter-panel">
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
        <label className="search-box">
          <span>검색</span>
          <input
            className="input"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="동 이름, 아파트명, 매물 제목으로 검색"
          />
        </label>
      </section>

      <section className="market-shell">
        <div className="listing-column">
          <div className="listing-summary">
            <strong>{filteredListings.length}</strong>
            <span>현재 표시 중인 매물</span>
          </div>

          <div className="listing-grid">
            {filteredListings.length === 0 ? (
              <div className="empty-panel">
                <strong>조건에 맞는 매물이 없습니다</strong>
                <p>필터를 바꾸거나 관리자가 공개한 새 매물을 기다려 주세요.</p>
              </div>
            ) : null}

            {filteredListings.map((listing) => (
              <article
                key={listing.id}
                className={`listing-card${selectedListingId === listing.id ? " selected" : ""}`}
                onMouseEnter={() => setSelectedListingId(listing.id)}
              >
                <div className="listing-thumb-wrap">
                  {listing.previewPhotoUrl ? (
                    <img src={listing.previewPhotoUrl} alt={listing.listingTitle} className="listing-thumb" />
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
                  <h2>{listing.listingTitle}</h2>
                  <p>{listing.addressLine1}</p>
                  <div className="listing-meta">
                    <span>{getPropertyTypeLabel(listing.propertyType)}</span>
                    <span>{listing.region3DepthName ?? "중구"}</span>
                    <span>{formatDateTime(listing.createdAt)}</span>
                  </div>
                  <div className="listing-footer">
                    <span>{listing.officeName}</span>
                    <Link href={`/listings/${listing.id}`} className="button button-small button-secondary">
                      상세 보기
                    </Link>
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
          {selectedListingId ? (
            <div className="selected-panel">
              {(() => {
                const selected = filteredListings.find((listing) => listing.id === selectedListingId);

                if (!selected) {
                  return null;
                }

                return (
                  <>
                    <div className="selected-header">
                      <div>
                        <strong>{selected.listingTitle}</strong>
                        <p>{selected.addressLine1}</p>
                      </div>
                      <Link href={`/listings/${selected.id}`} className="button button-primary button-small">
                        상세
                      </Link>
                    </div>
                    <div className="selected-grid">
                      <span>{formatTradeLabel(selected)}</span>
                      <span>{formatArea(selected.areaM2)}</span>
                      <span>{getPropertyTypeLabel(selected.propertyType)}</span>
                      <span>{selected.officePhone ?? "연락처 준비 중"}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : null}
        </aside>
      </section>
    </div>
  );
}
