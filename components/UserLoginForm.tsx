"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function UserLoginForm({ nextUrl = "/" }: { nextUrl?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "로그인에 실패했습니다.");
      }

      router.replace(nextUrl);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "로그인에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <span className="eyebrow">회원 로그인</span>
      <h1 className="page-title">일반 회원 로그인</h1>
      <p className="page-copy">매물 등록, 접수 완료 확인, 상세 페이지 진입을 위해 로그인해 주세요.</p>
      <div className="field">
        <label htmlFor="loginEmail">이메일</label>
        <input
          id="loginEmail"
          className="input"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          inputMode="email"
          autoComplete="username"
          placeholder="you@example.com"
        />
      </div>
      <div className="field">
        <label htmlFor="loginPassword">비밀번호</label>
        <input
          id="loginPassword"
          className="input"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          placeholder="비밀번호"
        />
      </div>
      {error ? <div className="error-banner">{error}</div> : null}
      <button className="button button-primary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "로그인 중..." : "로그인"}
      </button>
      <div className="button-row">
        <Link href={`/signup?next=${encodeURIComponent(nextUrl)}`} className="button button-secondary button-small">
          회원가입
        </Link>
        <Link href="/admin/login" className="button button-ghost button-small">
          관리자 로그인
        </Link>
      </div>
    </form>
  );
}
