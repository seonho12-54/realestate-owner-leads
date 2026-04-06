import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { getAdminSession, getUserSession } from "@/lib/auth";

import "./globals.css";

export const metadata: Metadata = {
  title: "울산 중구 부동산 플랫폼",
  description: "울산광역시 중구 한정 매물 등록과 조회를 지원하는 지도형 부동산 플랫폼",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const userSession = getUserSession();
  const adminSession = getAdminSession();

  return (
    <html lang="ko">
      <body>
        <div className="site-shell">
          <header className="site-header">
            <div className="brand-cluster">
              <Link href="/" className="site-brand">
                중구 부동산 플랫폼
              </Link>
              <span className="site-caption">울산광역시 중구 한정 지도형 매물 서비스</span>
            </div>

            <nav className="site-nav">
              <Link href="/">매물 보기</Link>
              <Link href="/sell">매물 등록</Link>
              <Link href="/privacy">개인정보</Link>
              {adminSession ? <Link href="/admin/leads">관리 콘솔</Link> : <Link href="/admin/login">관리자</Link>}
            </nav>

            <div className="auth-nav">
              {userSession ? (
                <>
                  <span className="auth-greeting">{userSession.name}님</span>
                  <form action="/api/auth/logout" method="post">
                    <button className="button button-ghost button-small" type="submit">
                      로그아웃
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className="button button-ghost button-small">
                    로그인
                  </Link>
                  <Link href="/signup" className="button button-primary button-small">
                    회원가입
                  </Link>
                </>
              )}
            </div>
          </header>

          <main className="page-shell">{children}</main>
        </div>
      </body>
    </html>
  );
}

