import { useEffect, useState } from "react";

import { MarketplaceShell } from "@/components/MarketplaceShell";
import { useSession } from "@/context/SessionContext";
import { listPublishedListings, type PublicListing } from "@/lib/leads";

export function HomePage() {
  const { session } = useSession();
  const [listings, setListings] = useState<PublicListing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
        setListings([]);
        setError(loadError instanceof Error ? loadError.message : "매물 정보를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (session.isLoading || (isLoading && listings.length === 0)) {
    return (
      <div className="page-stack">
        <section className="hero-panel compact">
          <span className="eyebrow">로딩 중</span>
          <h1 className="page-title page-title-medium">지역 매물 데이터를 준비하고 있습니다</h1>
          <p className="page-copy compact-copy">승인된 매물과 지도 데이터를 불러오는 동안 잠시만 기다려 주세요.</p>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-stack">
        <section className="hero-panel compact">
          <span className="eyebrow">불러오기 실패</span>
          <h1 className="page-title page-title-medium">매물 목록을 가져오지 못했습니다</h1>
          <p className="page-copy compact-copy">{error}</p>
        </section>
      </div>
    );
  }

  return <MarketplaceShell listings={listings} canUseMemberFeatures={session.authenticated} />;
}
