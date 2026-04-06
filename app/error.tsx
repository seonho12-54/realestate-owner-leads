"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ko">
      <body>
        <div className="site-shell">
          <main className="page-shell">
            <div className="page-stack">
              <section className="hero-panel">
                <span className="eyebrow">Server Error</span>
                <h1 className="page-title">서버에서 예외가 발생했습니다</h1>
                <p className="page-copy">
                  일시적인 문제일 수도 있지만, 보통은 환경변수 누락이나 데이터베이스 스키마 불일치일 가능성이 큽니다.
                  {error.digest ? ` 오류 식별값: ${error.digest}` : ""}
                </p>
                <div className="button-row">
                  <button type="button" className="button button-primary" onClick={() => reset()}>
                    다시 시도
                  </button>
                  <Link href="/" className="button button-secondary">
                    홈으로
                  </Link>
                </div>
              </section>
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
