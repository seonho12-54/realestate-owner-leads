import { Outlet } from "react-router-dom";

import { LogoutButton } from "@/components/LogoutButton";
import { Link } from "@/components/RouterLink";
import { useSession } from "@/context/SessionContext";
import { SERVICE_REGION_LABEL } from "@/lib/service-area";

export function SiteLayout() {
  const { session } = useSession();
  const isAdmin = session.kind === "admin";
  const isUser = session.kind === "user";

  return (
    <div className="stitch-shell">
      <header className="stitch-topbar">
        <Link href={isAdmin ? "/admin/leads" : "/"} className="stitch-brand-block">
          <span className="stitch-brand-kicker">WEB EDITION</span>
          <strong className="stitch-brand-title">UMI REALESTATE</strong>
          <p className="stitch-brand-note">{SERVICE_REGION_LABEL}</p>
        </Link>

        <div className="stitch-auth-actions">
          {isAdmin ? (
            <>
              <Link href="/admin/leads" className="nav-button nav-button-primary">
                관리자 모드
              </Link>
              <Link href="/sell" className="nav-button nav-button-secondary">
                매물 접수
              </Link>
              <LogoutButton action="/api/auth/logout" label="로그아웃" />
            </>
          ) : isUser ? (
            <>
              <Link href="/" className="nav-button nav-button-secondary">
                홈
              </Link>
              <Link href="/sell" className="nav-button nav-button-secondary">
                매물 접수
              </Link>
              <Link href="/me" className="nav-button nav-button-primary">
                마이페이지
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

      <main className="page-container">
        <Outlet />
      </main>
    </div>
  );
}
