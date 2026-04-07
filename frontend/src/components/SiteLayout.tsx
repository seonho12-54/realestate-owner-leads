import { Link, Outlet, useLocation } from "react-router-dom";

import { LogoutButton } from "@/components/LogoutButton";
import { useSession } from "@/context/SessionContext";
import { SERVICE_REGION_LABEL } from "@/lib/service-area";

type NavItem = {
  label: string;
  to: string;
  badge: string;
};

function getNavItems(isAdmin: boolean): NavItem[] {
  if (isAdmin) {
    return [
      { label: "Dashboard", to: "/admin/leads", badge: "DB" },
      { label: "Lead Queue", to: "/admin/leads", badge: "LD" },
      { label: "Public Map", to: "/", badge: "MP" },
      { label: "Privacy", to: "/privacy", badge: "PV" },
    ];
  }

  return [
    { label: "Dashboard", to: "/", badge: "DB" },
    { label: "Lead Intake", to: "/sell", badge: "IN" },
    { label: "Privacy", to: "/privacy", badge: "PV" },
    { label: "Admin", to: "/admin/login", badge: "AD" },
  ];
}

function isActive(pathname: string, item: NavItem) {
  if (item.to === "/") {
    return pathname === "/";
  }

  return pathname.startsWith(item.to);
}

export function SiteLayout() {
  const location = useLocation();
  const { session } = useSession();
  const adminSession = session.kind === "admin" ? session.user : null;
  const userSession = session.kind === "user" ? session.user : null;
  const navItems = getNavItems(Boolean(adminSession));

  return (
    <div className={`stitch-shell${adminSession ? " admin" : ""}`}>
      <aside className="stitch-sidebar">
        <div className="stitch-brand-block">
          <Link to={adminSession ? "/admin/leads" : "/"} className="stitch-brand-mark" aria-label="다우니 홈">
            <span className="stitch-brand-kicker">REAL ESTATE</span>
            <strong>INTELLIGENCE</strong>
          </Link>
          <p className="stitch-brand-note">{adminSession ? "Architectural Ledger Console" : SERVICE_REGION_LABEL}</p>
        </div>

        <nav className="stitch-side-nav" aria-label="주요 메뉴">
          {navItems.map((item) => (
            <Link key={item.label} to={item.to} className={`stitch-side-link${isActive(location.pathname, item) ? " active" : ""}`}>
              <span className="stitch-side-badge">{item.badge}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="stitch-side-footer">
          <Link to={adminSession ? "/admin/leads" : "/sell"} className="stitch-primary-action">
            <span className="stitch-plus">+</span>
            {adminSession ? "Review Pipeline" : "Add Lead"}
          </Link>
          <div className="stitch-support-link">
            <span className="stitch-support-icon">?</span>
            <span>Support</span>
          </div>
        </div>
      </aside>

      <div className="stitch-main">
        <header className="stitch-topbar">
          <label className="stitch-topbar-search" aria-label="검색">
            <span className="stitch-topbar-icon">⌕</span>
            <input
              type="text"
              placeholder={adminSession ? "Search owner, property, or lead ID..." : "Search address, owner, or listing keyword..."}
              readOnly
            />
          </label>

          <div className="stitch-topbar-actions">
            <button type="button" className="stitch-icon-button" aria-label="알림">
              •
            </button>
            <button type="button" className="stitch-icon-button" aria-label="최근 활동">
              ↺
            </button>

            {adminSession ? (
              <div className="stitch-user-card">
                <div>
                  <strong>{adminSession.name}</strong>
                  <span>Admin Console</span>
                </div>
                <div className="stitch-user-avatar">{adminSession.name.slice(0, 1)}</div>
              </div>
            ) : userSession ? (
              <div className="stitch-user-card">
                <div>
                  <strong>{userSession.name}</strong>
                  <span>Member Workspace</span>
                </div>
                <div className="stitch-user-avatar">{userSession.name.slice(0, 1)}</div>
              </div>
            ) : (
              <div className="stitch-auth-actions">
                <Link to="/login" className="button button-secondary button-small">
                  로그인
                </Link>
                <Link to="/signup" className="button button-primary button-small">
                  회원가입
                </Link>
              </div>
            )}

            {adminSession ? (
              <LogoutButton action="/api/admin/logout" redirectTo="/" label="로그아웃" className="button button-secondary button-small" />
            ) : userSession ? (
              <LogoutButton action="/api/auth/logout" redirectTo="/" label="로그아웃" className="button button-secondary button-small" />
            ) : (
              <Link to="/admin/login" className="button button-ghost button-small">
                관리자
              </Link>
            )}
          </div>
        </header>

        <main className="stitch-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
