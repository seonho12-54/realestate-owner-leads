import { useEffect, useState } from "react";

import { MarketplaceShell } from "@/components/MarketplaceShell";
import { Link } from "@/components/RouterLink";
import { useSession } from "@/context/SessionContext";
import { listPublishedListings, type PublicListing } from "@/lib/leads";

const teaserListings: PublicListing[] = [
  {
    id: 900001,
    listingTitle: "미리보기 오피스텔",
    propertyType: "officetel",
    transactionType: "monthly",
    regionSlug: "teaser",
    addressLine1: "지역 인증 후 실제 주소가 보여요",
    addressLine2: null,
    region3DepthName: "서교동",
    areaM2: 24,
    priceKrw: null,
    depositKrw: 10000000,
    monthlyRentKrw: 600000,
    description: "지도와 목록을 함께 비교하는 화면 미리보기입니다.",
    latitude: 37.5555,
    longitude: 126.9216,
    createdAt: new Date().toISOString(),
    officeName: "미리보기",
    officePhone: null,
    photoCount: 0,
    previewPhotoUrl: null,
  },
];

export function ExplorePage() {
  const { session } = useSession();
  const [listings, setListings] = useState<PublicListing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session.region.locked) {
      setListings(teaserListings);
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
        setError(loadError instanceof Error ? loadError.message : "매물을 불러오지 못했어요.");
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

  if (isLoading) {
    return (
      <div className="page-stack">
        <section className="page-panel">
          <span className="eyebrow">둘러보기</span>
          <h1 className="page-title page-title-medium">지도와 목록을 불러오는 중이에요.</h1>
        </section>
      </div>
    );
  }

  if (!session.region.locked || !session.region.region) {
    return (
      <div className="page-stack">
        <section className="locked-state-card">
          <div>
            <span className="eyebrow">미리보기 모드</span>
            <h1 className="page-title page-title-medium">지역 인증 전에는 실제 매물을 열 수 없어요</h1>
            <p className="page-copy">화면 구성은 미리볼 수 있지만, 실제 목록과 상세는 내 동네 인증 후에만 열립니다.</p>
          </div>
          <div className="button-row">
            <Link href="/" className="button button-primary">
              홈으로 돌아가기
            </Link>
            <Link href="/login" className="button button-secondary">
              로그인
            </Link>
          </div>
        </section>
        <MarketplaceShell
          listings={listings}
          regionName="미리보기 지역"
          title="지도와 목록을 함께 보는 화면"
          description="실제 매물은 지역 인증 후에만 열 수 있고, 지금은 탐색 흐름만 미리 확인할 수 있어요."
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-stack">
        <section className="page-panel">
          <span className="eyebrow">오류</span>
          <h1 className="page-title page-title-medium">탐색 화면을 불러오지 못했어요.</h1>
          <p className="page-copy compact-copy">{error}</p>
        </section>
      </div>
    );
  }

  return (
    <MarketplaceShell
      listings={listings}
      regionName={session.region.region.name}
      title="지도와 목록으로 빠르게 비교해보세요"
      description="핀을 누르면 카드가 같이 강조되고, 카드를 누르면 해당 위치가 바로 보이도록 연결했어요."
    />
  );
}
