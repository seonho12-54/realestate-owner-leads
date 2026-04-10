import { useEffect, useState } from "react";

import { MarketplaceShell } from "@/components/MarketplaceShell";
import { Link } from "@/components/RouterLink";
import { useSession } from "@/context/SessionContext";
import { listPreviewListings, listPublishedListings, type PublicListing } from "@/lib/leads";

export function ExplorePage() {
  const { session } = useSession();
  const [listings, setListings] = useState<PublicListing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  if (isLoading) {
    return (
      <div className="page-stack">
        <section className="page-panel">
          <span className="eyebrow">🔎 둘러보기</span>
          <h1 className="page-title page-title-medium">지금 올라온 매물을 불러오는 중이에요</h1>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-stack">
        <section className="page-panel">
          <span className="eyebrow">⚠️ 오류</span>
          <h1 className="page-title page-title-medium">둘러보기 화면을 불러오지 못했어요</h1>
          <p className="page-copy compact-copy">{error}</p>
        </section>
      </div>
    );
  }

  if (!session.region.locked || !session.region.region) {
    return (
      <div className="page-stack">
        <section className="locked-state-card">
          <div>
            <span className="eyebrow">🔍 미리보기 모드</span>
            <h1 className="page-title page-title-medium">실제 매물을 먼저 둘러보고, 우리 동네 인증 후 상세 정보를 확인해 보세요</h1>
            <p className="page-copy">
              지금 보이는 목록과 지도는 실제 DB 데이터 기반 미리보기예요. 상세 주소와 지역 제한은 인증 전에 열리지 않아요.
            </p>
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
          regionName="인증 전 미리보기"
          title="🏠 실제 매물 미리보기"
          description="지금은 기본 정보만 먼저 보여드리고 있어요. 인증 후에는 같은 데이터셋을 지도와 목록에서 더 자세히 비교할 수 있어요."
          previewMode
          emptyTitle="미리보기 매물이 아직 없어요"
          emptyDescription="잠시 후 다시 시도해 주세요."
        />
      </div>
    );
  }

  return (
    <MarketplaceShell
      listings={listings}
      regionName={session.region.region.name}
      title={`🏡 ${session.region.region.name}에서 바로 비교해 보세요`}
      description="가격, 거래방식, 지역, 면적을 먼저 보고 지도와 목록을 함께 비교할 수 있어요."
      emptyTitle="조건에 맞는 매물이 아직 없어요"
      emptyDescription="검색어를 바꾸거나 필터를 조금 넓혀 보세요."
    />
  );
}
