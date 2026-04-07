import { Link, Outlet } from "react-router-dom";

import { LogoutButton } from "@/components/LogoutButton";
import { useSession } from "@/context/SessionContext";

export function SiteLayout() {
  const { session } = useSession();
  const adminSession = session.kind === "admin" ? session.user : null;
  const userSession = session.kind === "user" ? session.user : null;

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="brand-cluster">
          <Link to={adminSession ? "/admin/leads" : "/"} className="site-brand" aria-label="다우니 홈">
            다우니
          </Link>
          <span className="site-caption">{adminSession ? "관리자 전용 콘솔" : "다운동 · 포곡읍 전용 매물 플랫폼"}</span>
        </div>

        <nav className="site-nav">
          {adminSession ? (
            <>
              <Link to="/admin/leads">관리 콘솔</Link>
              <Link to="/">공개 홈</Link>
              <Link to="/privacy">개인정보</Link>
            </>
          ) : (
            <>
              <Link to="/">매물 보기</Link>
              <Link to="/sell">매물 등록</Link>
              <Link to="/privacy">개인정보</Link>
            </>
          )}
        </nav>

        <div className="auth-nav">
          {adminSession ? (
            <>
              <span className="auth-greeting">{adminSession.name}</span>
              <LogoutButton action="/api/admin/logout" redirectTo="/" />
            </>
          ) : userSession ? (
            <>
              <span className="auth-greeting">{userSession.name}님</span>
              <LogoutButton action="/api/auth/logout" redirectTo="/" />
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
                관리자 전용
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
