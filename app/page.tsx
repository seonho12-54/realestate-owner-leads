import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";

import { MarketplaceShell } from "@/components/MarketplaceShell";
import { getAdminSession, getUserSession } from "@/lib/auth";
import { listPublishedListings, type PublicListing } from "@/lib/leads";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  noStore();

  let listings: PublicListing[] = [];
  let loadError: string | null = null;

  try {
    listings = await listPublishedListings();
  } catch (error) {
    console.error("Failed to load published listings", error);
    loadError = "매물 정보를 불러오지 못했습니다. 서버 설정이나 데이터베이스 상태를 확인해 주세요.";
  }

  const userSession = getUserSession();
  const adminSession = getAdminSession();

  return loadError ? (
    <div className="page-stack">
      <section className="hero-panel">
        <span className="eyebrow">서비스 확인 필요</span>
        <h1 className="page-title">매물 목록을 아직 불러오지 못했습니다</h1>
        <p className="page-copy">{loadError}</p>
        <div className="button-row">
          <Link href="/admin/login" className="button button-primary">
            관리자 로그인
          </Link>
          <Link href="/privacy" className="button button-secondary">
            개인정보 처리방침
          </Link>
        </div>
      </section>
    </div>
  ) : (
    <MarketplaceShell listings={listings} canUseMemberFeatures={Boolean(userSession || adminSession)} />
  );
}
