import { unstable_noStore as noStore } from "next/cache";

import { LocationGate } from "@/components/LocationGate";
import { MarketplaceShell } from "@/components/MarketplaceShell";
import { getUserSession } from "@/lib/auth";
import { listPublishedListings } from "@/lib/leads";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  noStore();

  const [listings, userSession] = await Promise.all([listPublishedListings(), Promise.resolve(getUserSession())]);

  return (
    <LocationGate>
      <MarketplaceShell listings={listings} isLoggedIn={Boolean(userSession)} />
    </LocationGate>
  );
}

