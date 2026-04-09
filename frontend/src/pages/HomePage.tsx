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
        setError(loadError instanceof Error ? loadError.message : "매물 목록을 불러오지 못했습니다.");
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

  if (session.isLoading || (isLoading && listings.length === 0 && !error)) {
    return (
      <div className="page-stack">
        <section className="page-panel">
          <span className="eyebrow">LOADING</span>
          <h1 className="page-title page-title-medium">공개 매물 화면을 준비하고 있습니다.</h1>
        </section>
      </div>
    );
  }

  if (error && listings.length === 0) {
    return (
      <div className="page-stack">
        <section className="page-panel">
          <span className="eyebrow">불러오기 실패</span>
          <h1 className="page-title page-title-medium">매물 목록을 가져오지 못했습니다.</h1>
          <p className="page-copy compact-copy">{error}</p>
        </section>
      </div>
    );
  }

  return <MarketplaceShell listings={listings} canUseMemberFeatures={session.authenticated} />;
}
