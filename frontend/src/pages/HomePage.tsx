import { useEffect, useState } from "react";

import { MarketplaceShell } from "@/components/MarketplaceShell";
import { Link } from "@/components/RouterLink";
import { useSession } from "@/context/SessionContext";
import { ApiError } from "@/lib/api";
import { listPublishedListings, type PublicListing } from "@/lib/leads";
import { verifyLocation } from "@/lib/region";
import { SERVICE_AREAS } from "@/lib/service-area";

type TeaserListing = {
  id: string;
  title: string;
  price: string;
  meta: string;
  area: string;
};

const teaserListings: TeaserListing[] = [
  { id: "1", title: "역세권 오피스텔 미리보기", price: "월세 1,000 / 60", meta: "서교동 · 오피스텔", area: "24.0㎡" },
  { id: "2", title: "채광 좋은 소형 아파트 미리보기", price: "전세 2억 4,000", meta: "다운동 · 아파트", area: "59.8㎡" },
  { id: "3", title: "주차 가능한 빌라 미리보기", price: "매매 3억 1,000", meta: "역북동 · 빌라", area: "74.2㎡" },
];

export function HomePage() {
  const { session, refreshSession } = useSession();
  const [listings, setListings] = useState<PublicListing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  const lockedRegion = session.region.region;

  useEffect(() => {
    if (!session.region.locked) {
      setListings([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

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
      setVerifyMessage("위치 인증은 HTTPS 환경에서만 가능해요.");
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
          setVerifyMessage("인증이 완료됐어요. 이제 우리 동네 매물만 보여드릴게요.");
        } catch (verifyError) {
          setVerifyMessage(verifyError instanceof Error ? verifyError.message : "위치 인증에 실패했어요.");
        } finally {
          setIsVerifying(false);
        }
      },
      (geoError) => {
        setIsVerifying(false);
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setVerifyMessage("위치 권한이 필요해요. 브라우저에서 허용 후 다시 시도해주세요.");
          return;
        }
        setVerifyMessage("현재 위치를 가져오지 못했어요. 잠시 후 다시 시도해주세요.");
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
          <h1 className="page-title page-title-medium">우리 동네 매물을 준비하고 있어요.</h1>
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
              이 서비스는 동네 기반 부동산 플랫폼이에요. 한 번 인증하면 인증한 지역의 매물만 보여드리고, 다른 지역 매물은 열 수 없어요.
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

        <section className="teaser-grid">
          {teaserListings.map((listing) => (
            <article key={listing.id} className="teaser-card">
              <span className="eyebrow">미리보기</span>
              <strong>{listing.title}</strong>
              <p>{listing.price}</p>
              <span>{listing.meta}</span>
              <span>{listing.area}</span>
            </article>
          ))}
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-stack">
        <section className="page-panel">
          <span className="eyebrow">불러오기 실패</span>
          <h1 className="page-title page-title-medium">인증 지역 매물을 가져오지 못했어요.</h1>
          <p className="page-copy compact-copy">{error}</p>
        </section>
      </div>
    );
  }

  return (
    <MarketplaceShell
      listings={listings}
      regionName={lockedRegion.name}
      title={`${lockedRegion.neighborhood}에서 바로 비교해보세요`}
      description="사진, 가격, 거래방식, 면적을 먼저 보고 지도와 목록을 함께 오가며 빠르게 후보를 줄일 수 있어요."
      emptyTitle="인증한 지역에 공개된 매물이 아직 없어요"
      emptyDescription="조금 뒤 다시 확인하거나 매물 등록으로 첫 매물을 남겨보세요."
    />
  );
}
