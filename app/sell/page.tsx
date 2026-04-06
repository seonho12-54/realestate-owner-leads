import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { SellLeadForm } from "@/components/SellLeadForm";
import { getAdminSession, getUserSession } from "@/lib/auth";
import { listActiveOffices } from "@/lib/offices";

export const dynamic = "force-dynamic";

export default async function SellPage() {
  noStore();

  const adminSession = getAdminSession();
  const userSession = getUserSession();
  const session = adminSession ?? userSession;
  const offices = session ? await listActiveOffices() : [];

  if (!session) {
    return (
      <div className="page-stack">
        <section className="hero-panel">
          <span className="eyebrow">로그인 후 등록</span>
          <h1 className="page-title">매물 등록은 회원 또는 관리자 로그인 후 이용할 수 있어요</h1>
          <p className="page-copy">현재 위치가 `울산광역시 중구 다운동` 또는 `경기도 용인시 처인구 포곡읍`일 때만 등록할 수 있습니다.</p>
          <div className="button-row">
            <Link href="/login?next=/sell" className="button button-primary">
              회원 로그인
            </Link>
            <Link href="/signup?next=/sell" className="button button-secondary">
              회원가입
            </Link>
            <Link href="/admin/login" className="button button-ghost">
              관리자 로그인
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="hero-panel compact">
        <div>
          <span className="eyebrow">매물 등록</span>
          <h1 className="page-title">다우니 허용 지역에서만 매물을 접수할 수 있어요</h1>
          <p className="page-copy">허용 지역은 `다운동`과 `포곡읍` 두 곳입니다. 위치 확인과 주소 검색을 통과한 매물만 접수됩니다.</p>
        </div>
      </section>
      <SellLeadForm offices={offices} initialOfficeId={offices[0]?.id ?? null} userName={session.name} userEmail={session.email} />
    </div>
  );
}
