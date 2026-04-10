import { useEffect, useMemo, useState } from "react";

import { KakaoMapPanel } from "@/components/KakaoMapPanel";
import { Link } from "@/components/RouterLink";
import { formatArea, formatTradeLabel, getPropertyTypeLabel, getTransactionTypeLabel } from "@/lib/format";
import { isSavedListing, toggleSavedListing } from "@/lib/listing-prefs";
import type { PublicListing } from "@/lib/leads";

type MarketplaceShellProps = {
  listings: PublicListing[];
  regionName: string;
  title: string;
  description: string;
  emptyTitle?: string;
  emptyDescription?: string;
};

function listingHasKeyword(listing: PublicListing, keyword: string) {
  const source = `${listing.listingTitle} ${listing.description ?? ""}`.toLowerCase();
  return source.includes(keyword);
}

export function MarketplaceShell({
  listings,
  regionName,
  title,
  description,
  emptyTitle = "조건에 맞는 매물이 아직 없어요",
  emptyDescription = "필터를 조금 넓히거나 다른 거래방식을 확인해보세요.",
}: MarketplaceShellProps) {
  const [selectedListingId, setSelectedListingId] = useState<number | null>(listings[0]?.id ?? null);
  const [search, setSearch] = useState("");
  const [transactionFilter, setTransactionFilter] = useState("all");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [parkingOnly, setParkingOnly] = useState(false);
  const [petOnly, setPetOnly] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [savedIds, setSavedIds] = useState<number[]>([]);

  useEffect(() => {
    setSavedIds(listings.map((listing) => listing.id).filter((listingId) => isSavedListing(listingId)));
  }, [listings]);

  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      if (transactionFilter !== "all" && listing.transactionType !== transactionFilter) {
        return false;
      }

      if (propertyFilter !== "all" && listing.propertyType !== propertyFilter) {
        return false;
      }

      if (search.trim()) {
        const searchValue = search.trim().toLowerCase();
        const source = `${listing.listingTitle} ${listing.addressLine1} ${listing.region3DepthName ?? ""}`.toLowerCase();
        if (!source.includes(searchValue)) {
          return false;
        }
      }

      if (parkingOnly && !listingHasKeyword(listing, "주차")) {
        return false;
      }

      if (petOnly && !listingHasKeyword(listing, "반려") && !listingHasKeyword(listing, "애완")) {
        return false;
      }

      return true;
    });
  }, [listings, parkingOnly, petOnly, propertyFilter, search, transactionFilter]);

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

  function handleToggleSave(listingId: number) {
    setSavedIds(toggleSavedListing(listingId));
  }

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <span className="eyebrow">우리 동네 매물</span>
          <h1 className="page-title page-title-medium">{title}</h1>
          <p className="page-copy">{description}</p>
        </div>
        <div className="hero-region-card">
          <span>현재 지역</span>
          <strong>{regionName}</strong>
          <p>검색과 필터는 인증한 지역 안에서만 동작해요.</p>
        </div>
      </section>

      <section className="filter-bar">
        <input
          className="input search-input"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="동네, 주소, 매물명을 검색해보세요"
        />
        <div className="chip-group">
          {[
            { key: "all", label: "전체" },
            { key: "sale", label: "매매" },
            { key: "jeonse", label: "전세" },
            { key: "monthly", label: "월세" },
          ].map((chip) => (
            <button
              key={chip.key}
              type="button"
              className={`chip${transactionFilter === chip.key ? " active" : ""}`}
              onClick={() => setTransactionFilter(chip.key)}
            >
              {chip.label}
            </button>
          ))}
        </div>
        <div className="chip-group">
          {[
            { key: "all", label: "매물유형" },
            { key: "apartment", label: "아파트" },
            { key: "officetel", label: "오피스텔" },
            { key: "villa", label: "빌라" },
            { key: "house", label: "주택" },
            { key: "commercial", label: "상가" },
          ].map((chip) => (
            <button
              key={chip.key}
              type="button"
              className={`chip${propertyFilter === chip.key ? " active" : ""}`}
              onClick={() => setPropertyFilter(chip.key)}
            >
              {chip.label}
            </button>
          ))}
          <button type="button" className={`chip${parkingOnly ? " active" : ""}`} onClick={() => setParkingOnly((value) => !value)}>
            주차
          </button>
          <button type="button" className={`chip${petOnly ? " active" : ""}`} onClick={() => setPetOnly((value) => !value)}>
            반려동물
          </button>
        </div>
      </section>

      <div className="mobile-toggle-row">
        <button type="button" className={`chip${!showMap ? " active" : ""}`} onClick={() => setShowMap(false)}>
          목록 보기
        </button>
        <button type="button" className={`chip${showMap ? " active" : ""}`} onClick={() => setShowMap(true)}>
          지도 보기
        </button>
      </div>

      <section className={`market-shell${showMap ? " map-mode" : ""}`}>
        <div className="listing-column">
          <div className="listing-summary">
            <strong>{filteredListings.length}</strong>
            <span>{regionName}에서 볼 수 있는 매물</span>
          </div>

          {filteredListings.length === 0 ? (
            <div className="empty-panel">
              <strong>{emptyTitle}</strong>
              <p>{emptyDescription}</p>
            </div>
          ) : (
            <div className="listing-card-grid">
              {filteredListings.map((listing) => {
                const isSaved = savedIds.includes(listing.id);

                return (
                  <article
                    key={listing.id}
                    className={`listing-card${selectedListingId === listing.id ? " selected" : ""}`}
                    onMouseEnter={() => setSelectedListingId(listing.id)}
                  >
                    <button type="button" className="listing-save-button" onClick={() => handleToggleSave(listing.id)}>
                      {isSaved ? "저장됨" : "저장"}
                    </button>

                    <button type="button" className="listing-card-hit" onClick={() => setSelectedListingId(listing.id)}>
                      <div className="listing-thumb-wrap">
                        {listing.previewPhotoUrl ? (
                          <img className="listing-thumb" src={listing.previewPhotoUrl} alt={listing.listingTitle} />
                        ) : (
                          <div className="listing-thumb empty">사진 준비 중</div>
                        )}
                        <span className={`listing-badge transaction-${listing.transactionType}`}>{getTransactionTypeLabel(listing.transactionType)}</span>
                      </div>

                      <div className="listing-content">
                        <strong>{listing.listingTitle}</strong>
                        <div className="listing-price">{formatTradeLabel(listing)}</div>
                        <span className="listing-location">{listing.region3DepthName ?? regionName}</span>
                        <div className="listing-meta">
                          <span>{getPropertyTypeLabel(listing.propertyType)}</span>
                          <span>{formatArea(listing.areaM2)}</span>
                        </div>
                      </div>
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <aside className="map-column">
          <KakaoMapPanel listings={filteredListings} selectedListingId={selectedListingId} onSelect={setSelectedListingId} />

          {selectedListing ? (
            <div className="selected-panel">
              <div className="selected-header">
                <div>
                  <span className="eyebrow">선택한 매물</span>
                  <strong>{selectedListing.listingTitle}</strong>
                </div>
                <span className={`status-badge transaction-${selectedListing.transactionType}`}>{getTransactionTypeLabel(selectedListing.transactionType)}</span>
              </div>

              <div className="selected-grid">
                <span>{formatTradeLabel(selectedListing)}</span>
                <span>{getPropertyTypeLabel(selectedListing.propertyType)}</span>
                <span>{formatArea(selectedListing.areaM2)}</span>
                <span>{selectedListing.region3DepthName ?? regionName}</span>
              </div>

              <p className="page-copy compact-copy">{selectedListing.description ?? "상세 설명은 매물 화면에서 바로 확인할 수 있어요."}</p>

              <div className="button-row">
                <Link href={`/listings/${selectedListing.id}`} className="button button-primary">
                  상세 보기
                </Link>
                <button type="button" className="button button-secondary" onClick={() => handleToggleSave(selectedListing.id)}>
                  {savedIds.includes(selectedListing.id) ? "저장 해제" : "저장"}
                </button>
              </div>
            </div>
          ) : null}
        </aside>
      </section>
    </div>
  );
}
