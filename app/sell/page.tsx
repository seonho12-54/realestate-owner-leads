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
          <h1 className="page-title">매물 등록은 로그인 후 이용할 수 있습니다</h1>
          <p className="page-copy">계정을 만들면 울산 중구 안에서 접수한 매물을 등록하고, 관리자 검토 후 공개 매물로 전환할 수 있습니다.</p>
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
          <h1 className="page-title">중구 안의 실제 등록 가능한 매물만 올려 주세요</h1>
          <p className="page-copy">위치 확인과 주소 검증을 통과한 매물만 접수됩니다. 등록 후 관리자 검토를 거쳐 공개 목록에 노출됩니다.</p>
        </div>
      </section>
      <SellLeadForm offices={offices} initialOfficeId={offices[0]?.id ?? null} userName={session.name} userEmail={session.email} />
    </div>
  );
}

