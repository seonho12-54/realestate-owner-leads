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
          <p className="page-copy">일반 회원은 위치 확인 후 등록하고, 관리자는 어느 위치에서든 바로 등록할 수 있습니다.</p>
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
          <h1 className="page-title">다우니에서 중구 매물을 바로 접수해 보세요</h1>
          <p className="page-copy">
            {adminSession
              ? "관리자 계정은 현재 위치와 상관없이 등록할 수 있습니다. 주소만 중구로 정확히 입력해 주세요."
              : "현재 위치 확인, 주소 검색, 사진 업로드까지 한 번에 마치면 관리자가 공개 여부를 검토합니다."}
          </p>
        </div>
      </section>
      <SellLeadForm
        offices={offices}
        initialOfficeId={offices[0]?.id ?? null}
        userName={session.name}
        userEmail={session.email}
        bypassLocationCheck={Boolean(adminSession)}
      />
    </div>
  );
}
