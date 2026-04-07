import { Link, Outlet } from "react-router-dom";

import { LogoutButton } from "@/components/LogoutButton";
import { useSession } from "@/context/SessionContext";
import { SERVICE_REGION_LABEL } from "@/lib/service-area";

export function SiteLayout() {
  const { session } = useSession();
  const adminSession = session.kind === "admin" ? session.user : null;
  const userSession = session.kind === "user" ? session.user : null;

  return (
    <div className="site-shell downy-shell">
      <header className={`shell-header${adminSession ? " admin" : ""}`}>
        <div className="shell-branding">
          <Link to={adminSession ? "/admin/leads" : "/"} className="shell-brand-line" aria-label="다우니 홈">
            <span className="shell-brand-word">다우니</span>
            <span className="shell-brand-chip">{adminSession ? "운영 콘솔" : "WEB EDITION"}</span>
          </Link>
          <div className="shell-brand-copy">
            <span className="shell-brand-caption">
              {adminSession
                ? "승인 전환, 메모 관리, 공개 상태 변경까지 한 번에 관리하는 관리자 워크스페이스"
                : `${SERVICE_REGION_LABEL} 중심 승인형 매물 접수 · 공개 플랫폼`}
            </span>
          </div>
        </div>

        <nav className="shell-nav" aria-label="주요 메뉴">
          {adminSession ? (
            <>
              <Link to="/admin/leads" className="shell-nav-link">
                관리자 콘솔
              </Link>
              <Link to="/" className="shell-nav-link">
                공개 홈
              </Link>
              <Link to="/privacy" className="shell-nav-link">
                개인정보
              </Link>
            </>
          ) : (
            <>
              <Link to="/" className="shell-nav-link">
                홈
              </Link>
              <Link to="/sell" className="shell-nav-link">
                매물 등록
              </Link>
              <Link to="/privacy" className="shell-nav-link">
                개인정보 처리방침
              </Link>
            </>
          )}
        </nav>

        <div className="shell-userbar">
          {adminSession ? (
            <>
              <span className="shell-user-pill">{adminSession.name} 관리자</span>
              <LogoutButton action="/api/admin/logout" redirectTo="/" label="로그아웃" className="button button-secondary button-small" />
            </>
          ) : userSession ? (
            <>
              <span className="shell-user-pill">{userSession.name}님</span>
              <LogoutButton action="/api/auth/logout" redirectTo="/" label="로그아웃" className="button button-secondary button-small" />
            </>
          ) : (
            <>
              <Link to="/login" className="button button-ghost button-small">
                로그인
              </Link>
              <Link to="/signup" className="button button-primary button-small">
                회원가입
              </Link>
              <Link to="/admin/login" className="button button-secondary button-small">
                관리자
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="page-shell">
        <Outlet />
      </main>
    </div>
  );
}
