import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { SellLeadForm } from "@/components/SellLeadForm";
import { getUserSession } from "@/lib/auth";
import { listActiveOffices } from "@/lib/offices";

export const dynamic = "force-dynamic";

export default async function SellPage() {
  noStore();

  const session = getUserSession();
  const offices = session ? await listActiveOffices() : [];

  if (!session) {
    return (
      <div className="page-stack">
        <section className="hero-panel">
          <span className="eyebrow">회원 전용 등록</span>
          <h1 className="page-title">매물 등록은 로그인 후 이용할 수 있어요</h1>
          <p className="page-copy">다우니 계정으로 로그인하면 위치 확인 후 매물을 접수하고, 관리자 검토 뒤 공개 매물로 전환할 수 있습니다.</p>
          <div className="button-row">
            <Link href="/login?next=/sell" className="button button-primary">
              로그인
            </Link>
            <Link href="/signup?next=/sell" className="button button-secondary">
              회원가입
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
          <h1 className="page-title">다우니에서 중구 매물을 바로 접수해 보세요</h1>
          <p className="page-copy">현재 위치 확인, 주소 검색, 사진 업로드까지 한 번에 마치면 관리자가 공개 여부를 검토합니다.</p>
        </div>
      </section>
      <SellLeadForm offices={offices} initialOfficeId={offices[0]?.id ?? null} userName={session.name} userEmail={session.email} />
    </div>
  );
}
