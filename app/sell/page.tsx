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
        <section className="hero-panel hero-panel-slim">
          <span className="eyebrow">로그인 후 등록</span>
          <h1 className="page-title page-title-medium">매물 등록은 회원 또는 관리자 로그인 후 이용할 수 있어요</h1>
          <p className="page-copy compact-copy">현재 위치가 허용 지역인지 확인한 뒤 매물 등록을 진행합니다.</p>
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
      <section className="hero-panel compact hero-panel-slim">
        <div>
          <span className="eyebrow">매물 등록</span>
          <h1 className="page-title page-title-medium">허용 지역 매물만 간단하게 접수해 주세요</h1>
          <p className="page-copy compact-copy">위치 인증과 주소 검색을 통과한 매물만 접수되고, 공개는 관리자 승인 후 진행됩니다.</p>
        </div>
      </section>
      <SellLeadForm offices={offices} initialOfficeId={offices[0]?.id ?? null} userName={session.name} userEmail={session.email} />
    </div>
  );
}
