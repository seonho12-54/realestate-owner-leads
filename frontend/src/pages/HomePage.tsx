import { useEffect, useMemo, useState } from "react";

import { MarketplaceShell } from "@/components/MarketplaceShell";
import { Link } from "@/components/RouterLink";
import { useSession } from "@/context/SessionContext";
import { ApiError } from "@/lib/api";
import { formatArea, formatTradeLabel, getPropertyTypeLabel } from "@/lib/format";
import { listPreviewListings, listPublishedListings, type PublicListing } from "@/lib/leads";
import { verifyLocation } from "@/lib/region";
import { SERVICE_AREAS } from "@/lib/service-area";

export function HomePage() {
  const { session, refreshSession } = useSession();
  const [listings, setListings] = useState<PublicListing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  const lockedRegion = session.region.region;
  const previewListings = useMemo(() => listings.slice(0, 3), [listings]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const loader = session.region.locked ? listPublishedListings() : listPreviewListings(6);

    loader
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

        if (loadError instanceof ApiError && loadError.code === "REGION_VERIFICATION_REQUIRED") {
          setListings([]);
          setError(null);
          return;
        }

        setListings([]);
        setError(loadError instanceof Error ? loadError.message : "매물 목록을 불러오지 못했어요.");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [session.region.locked]);

  async function handleVerify() {
    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      setVerifyMessage("위치 인증은 HTTPS 환경에서만 사용할 수 있어요.");
      return;
    }

    if (!navigator.geolocation) {
      setVerifyMessage("이 기기에서는 위치 서비스를 사용할 수 없어요.");
      return;
    }

    setIsVerifying(true);
    setVerifyMessage("현재 위치를 확인하고 있어요...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await verifyLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          await refreshSession();
          setVerifyMessage("📍 내 동네 인증이 완료됐어요. 이제 인증한 지역 매물만 보여드릴게요.");
        } catch (verifyError) {
          setVerifyMessage(verifyError instanceof Error ? verifyError.message : "위치 인증에 실패했어요.");
        } finally {
          setIsVerifying(false);
        }
      },
      (geoError) => {
        setIsVerifying(false);
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setVerifyMessage("위치 권한을 허용한 뒤 다시 시도해 주세요.");
          return;
        }

        setVerifyMessage("현재 위치를 가져오지 못했어요. 잠시 후 다시 시도해 주세요.");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 1000 * 60 * 5,
      },
    );
  }

  if (session.isLoading || isLoading) {
    return (
      <div className="page-stack">
        <section className="page-panel">
          <span className="eyebrow">로딩 중</span>
          <h1 className="page-title page-title-medium">우리 동네 매물을 준비하고 있어요</h1>
        </section>
      </div>
    );
  }

  if (!session.region.locked || !lockedRegion) {
    return (
      <div className="page-stack">
        <section className="hero-card onboarding-card">
          <div>
            <span className="eyebrow">한 번만 인증</span>
            <h1 className="page-title">내 동네 인증하고 우리 동네 매물만 빠르게 보세요</h1>
            <p className="page-copy">
              동네 기반 부동산 서비스라서, 위치 인증을 완료하면 인증한 지역 매물만 안전하게 보여드려요.
            </p>
            <div className="button-row">
              <button type="button" className="button button-primary" onClick={handleVerify} disabled={isVerifying}>
                {isVerifying ? "인증 중..." : "내 동네 인증하기"}
              </button>
              <Link href="/explore" className="button button-secondary">
                미리보기만 보기
              </Link>
            </div>
            {verifyMessage ? <p className="page-copy compact-copy">{verifyMessage}</p> : null}
          </div>

          <div className="onboarding-side">
            <strong>지원 지역</strong>
            <ul className="simple-list">
              {SERVICE_AREAS.map((area) => (
                <li key={area.slug}>{area.name}</li>
              ))}
            </ul>
          </div>
        </section>

        {error ? (
          <section className="page-panel">
            <span className="eyebrow">미리보기 오류</span>
            <h2 className="section-title">실시간 미리보기를 불러오지 못했어요</h2>
            <p className="page-copy compact-copy">{error}</p>
          </section>
        ) : null}

        <section className="saved-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">실데이터 미리보기</span>
              <h2 className="section-title">인증 전에도 실제 매물을 먼저 볼 수 있어요</h2>
            </div>
            <Link href="/explore" className="button button-secondary button-small">
              전체 미리보기 보기
            </Link>
          </div>

          {previewListings.length === 0 ? (
            <div className="empty-panel">
              <strong>🏠 미리보기 매물이 아직 없어요</strong>
              <p>잠시 후 다시 확인해 주세요.</p>
            </div>
          ) : (
            <div className="preview-card-grid">
              {previewListings.map((listing) => (
                <article key={listing.id} className="preview-card">
                  {listing.previewPhotoUrl ? (
                    <img className="preview-card-thumb" src={listing.previewPhotoUrl} alt={listing.listingTitle} />
                  ) : (
                    <div className="preview-card-thumb empty">사진 준비 중</div>
                  )}
                  <span className="preview-badge">미리보기</span>
                  <strong className="preview-card-price">{formatTradeLabel(listing)}</strong>
                  <strong>{listing.region3DepthName ?? "인증 가능 지역"} · {getPropertyTypeLabel(listing.propertyType)}</strong>
                  <span>{formatArea(listing.areaM2)}</span>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-stack">
        <section className="page-panel">
          <span className="eyebrow">불러오기 실패</span>
          <h1 className="page-title page-title-medium">인증 지역 매물을 가져오지 못했어요</h1>
          <p className="page-copy compact-copy">{error}</p>
        </section>
      </div>
    );
  }

  return (
    <MarketplaceShell
      listings={listings}
      regionName={lockedRegion.name}
      title={`${lockedRegion.neighborhood}에서 바로 비교해 보세요`}
      description="가격, 거래방식, 지역, 면적을 먼저 보고 지도와 목록을 함께 비교할 수 있어요."
      emptyTitle="인증한 지역에 공개된 매물이 아직 없어요."
      emptyDescription="잠시 후 다시 확인하거나 새 매물 등록을 기다려 주세요."
    />
  );
}
