import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { LogoutButton } from "@/components/LogoutButton";
import { getAdminSession, getUserSession } from "@/lib/auth";

import "./globals.css";

export const metadata: Metadata = {
  title: "다우니",
  description: "다운동과 포곡읍 전용 지역 매물 플랫폼",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const adminSession = getAdminSession();
  const userSession = getUserSession();

  return (
    <html lang="ko">
      <body>
        <div className="site-shell">
          <header className="site-header">
            <div className="brand-cluster">
              <Link href={adminSession ? "/admin/leads" : "/"} className="site-brand" aria-label="다우니 홈">
                다우니
              </Link>
              <span className="site-caption">{adminSession ? "관리자 전용 콘솔" : "다운동 · 포곡읍 전용 매물 플랫폼"}</span>
            </div>

            <nav className="site-nav">
              {adminSession ? (
                <>
                  <Link href="/admin/leads">관리 콘솔</Link>
                  <Link href="/">공개 홈</Link>
                  <Link href="/privacy">개인정보</Link>
                </>
              ) : (
                <>
                  <Link href="/">매물 보기</Link>
                  <Link href="/sell">매물 등록</Link>
                  <Link href="/privacy">개인정보</Link>
                </>
              )}
            </nav>

            <div className="auth-nav">
              {adminSession ? (
                <>
                  <span className="auth-greeting">{adminSession.name} 관리자</span>
                  <LogoutButton action="/api/admin/logout" redirectTo="/" />
                </>
              ) : userSession ? (
                <>
                  <span className="auth-greeting">{userSession.name}님</span>
                  <LogoutButton action="/api/auth/logout" redirectTo="/" />
                </>
              ) : (
                <>
                  <Link href="/login" className="button button-ghost button-small">
                    로그인
                  </Link>
                  <Link href="/signup" className="button button-primary button-small">
                    회원가입
                  </Link>
                  <Link href="/admin/login" className="button button-secondary button-small">
                    관리자 전용
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
