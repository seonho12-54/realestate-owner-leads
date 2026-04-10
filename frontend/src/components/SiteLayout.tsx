import { Outlet } from "react-router-dom";

import { LogoutButton } from "@/components/LogoutButton";
import { Link } from "@/components/RouterLink";
import { useSession } from "@/context/SessionContext";
import { SERVICE_REGION_LABEL } from "@/lib/service-area";

export function SiteLayout() {
  const { session } = useSession();
  const isAdmin = session.kind === "admin";
  const regionName = session.region.region?.name ?? "지역 인증 전";

  return (
    <div className="app-shell">
      <header className="top-shell">
        <div className="brand-row">
          <Link href={isAdmin ? "/admin/leads" : "/"} className="brand-link">
            <span className="brand-badge">LOCAL HOME</span>
            <strong>다우니</strong>
          </Link>
          <div className="region-pill">
            <span>인증 지역</span>
            <strong>{regionName}</strong>
          </div>
        </div>

        <div className="top-actions">
          {isAdmin ? (
            <>
              <Link href="/admin/leads" className="nav-button nav-button-primary">
                매물 관리
              </Link>
              <LogoutButton action="/api/admin/logout" label="로그아웃" />
            </>
          ) : session.authenticated ? (
            <>
              <Link href="/sell" className="nav-button nav-button-secondary">
                새 매물 등록
              </Link>
              <LogoutButton action="/api/auth/logout" label="로그아웃" />
            </>
          ) : (
            <>
              <Link href="/login" className="nav-button nav-button-secondary">
                로그인
              </Link>
              <Link href="/signup" className="nav-button nav-button-primary">
                회원가입
              </Link>
            </>
          )}
        </div>
      </header>

      {!isAdmin ? (
        <section className="service-strip">
          <div>
            <span className="service-strip-label">서비스 지역</span>
            <strong>{SERVICE_REGION_LABEL}</strong>
          </div>
          <p>내 동네 인증을 한 번만 완료하면 그 지역 매물만 빠르게 비교해서 볼 수 있어요.</p>
        </section>
      ) : null}

      <main className="page-container">
        <Outlet />
      </main>

      {!isAdmin ? (
        <nav className="bottom-nav" aria-label="주요 메뉴">
          <Link href="/" className="bottom-nav-link">
            홈
          </Link>
          <Link href="/explore" className="bottom-nav-link">
            둘러보기
          </Link>
          <Link href="/manage" className="bottom-nav-link">
            매물 관리
          </Link>
          <Link href="/me" className="bottom-nav-link">
            설정
          </Link>
        </nav>
      ) : null}
    </div>
  );
}
