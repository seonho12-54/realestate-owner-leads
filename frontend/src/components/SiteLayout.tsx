import { Outlet, useLocation } from "react-router-dom";

import { LogoutButton } from "@/components/LogoutButton";
import { Link } from "@/components/RouterLink";
import { useSession } from "@/context/SessionContext";
import { SERVICE_REGION_LABEL } from "@/lib/service-area";

const OFFICE_ADDRESS = "울산광역시 중구 다운로 160";
const OFFICE_NAME = "다운우리공인중개사사무소";
const OFFICE_PHONE = "010-9904-1031";
const BLOG_URL = "https://blog.naver.com/tedted111";

const NAV_ITEMS = [
  { href: "/", label: "홈", icon: "🏠" },
  { href: "/sell", label: "문의하기", icon: "💬" },
  { href: "/manage", label: "내 매물", icon: "🏡" },
  { href: "/me", label: "내 정보", icon: "👤" },
];

export function SiteLayout() {
  const { session } = useSession();
  const location = useLocation();
  const isAdmin = session.kind === "admin";
  const isVerified = session.region.locked;
  const regionName = session.region.region?.name ?? "인증 전";

  return (
    <div className="app-shell">
      <header className="top-shell">
        <div className="brand-row">
          <Link href={isAdmin ? "/admin/leads" : "/"} className="brand-link" aria-label="홈으로 바로가기">
            <div className="brand-logo-mark" aria-hidden="true">
              🏠
            </div>
            <div className="brand-text-group">
              <div className="brand-name">다운이</div>
              <div className="brand-badge">LOCAL HOME · {SERVICE_REGION_LABEL}</div>
            </div>
          </Link>
        </div>

        {!isAdmin ? (
          <div className="header-center">
            <div className="region-status-chip">
              <div className={`region-dot${isVerified ? "" : " unverified"}`} />
              <span className="region-label">인증 지역</span>
              <span className="region-name">{regionName}</span>
            </div>

            <div className="contact-pill">
              <span className="contact-pill-label">부동산 문의</span>
              <strong>{OFFICE_NAME}</strong>
              <p>
                {OFFICE_PHONE} · {OFFICE_ADDRESS}
              </p>
              <a href={BLOG_URL} className="contact-pill-link" target="_blank" rel="noreferrer">
                블로그 바로가기 →
              </a>
            </div>
          </div>
        ) : (
          <div className="header-center">
            <div className="region-status-chip">
              <div className="region-dot" />
              <span className="region-label">관리자 모드</span>
              <span className="region-name">다운이 관리자</span>
            </div>
          </div>
        )}

        <div className="top-actions">
          {isAdmin ? (
            <>
              <Link href="/sell" className="nav-button nav-button-secondary button-small">
                문의 관리
              </Link>
              <Link href="/admin/leads" className="nav-button nav-button-primary button-small">
                매물 관리
              </Link>
              <LogoutButton action="/api/admin/logout" label="로그아웃" />
            </>
          ) : session.authenticated ? (
            <LogoutButton action="/api/auth/logout" label="로그아웃" />
          ) : (
            <>
              <Link href="/login" className="nav-button nav-button-secondary button-small">
                로그인
              </Link>
              <Link href="/signup" className="nav-button nav-button-primary button-small">
                회원가입
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="page-container">
        <Outlet />
      </main>

      {!isAdmin ? (
        <nav className="bottom-nav" aria-label="주요 메뉴">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === "/" ? location.pathname === "/" : location.pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`bottom-nav-link${isActive ? " active" : ""}`} data-icon={item.icon}>
                {item.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
