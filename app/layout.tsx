import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "부동산 매물 접수",
  description: "집주인 매물 접수와 관리자 확인을 위한 부동산 중개사무소 웹앱",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div className="app-bg" />
        <div className="site-shell">
          <header className="site-header">
            <Link href="/" className="site-brand">
              집주인 매물 접수
            </Link>
            <nav className="site-nav">
              <Link href="/sell">매물 접수</Link>
              <Link href="/privacy">개인정보 처리방침</Link>
              <Link href="/admin/login">관리자</Link>
            </nav>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}

