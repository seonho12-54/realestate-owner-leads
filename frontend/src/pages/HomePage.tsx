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

  if (session.isLoading || (isLoading && listings.length === 0)) {
    return (
      <div className="page-stack">
        <section className="stitch-data-panel">
          <div className="stitch-panel-header">
            <div>
              <span className="stitch-panel-kicker">Loading</span>
              <h2>공개 매물 인텔리전스를 준비하고 있습니다.</h2>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-stack">
        <section className="stitch-data-panel">
          <div className="stitch-panel-header">
            <div>
              <span className="stitch-panel-kicker">Load Failed</span>
              <h2>매물 목록을 가져오지 못했습니다.</h2>
            </div>
            <p>{error}</p>
          </div>
        </section>
      </div>
    );
  }

  return <MarketplaceShell listings={listings} canUseMemberFeatures={session.authenticated} />;
}
