"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminLoginForm() {
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

      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "관리자 로그인에 실패했습니다.");
      }

      router.replace("/admin/leads");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "관리자 로그인에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-card admin" onSubmit={handleSubmit}>
      <span className="eyebrow">Admin Only</span>
      <h1 className="page-title">관리자 전용 로그인</h1>
      <p className="page-copy">관리자 계정으로 로그인하면 접수 목록, 공개 여부, 메모를 관리하는 전용 콘솔로 이동합니다.</p>
      <div className="field">
        <label htmlFor="adminEmail">관리자 이메일</label>
        <input
          id="adminEmail"
          className="input"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          inputMode="email"
          autoComplete="username"
          placeholder="admin@example.com"
        />
      </div>
      <div className="field">
        <label htmlFor="adminPassword">비밀번호</label>
        <input
          id="adminPassword"
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
        {isSubmitting ? "로그인 중..." : "관리자 로그인"}
      </button>
      <div className="button-row">
        <Link href="/" className="button button-secondary button-small">
          공개 홈으로
        </Link>
        <Link href="/login" className="button button-ghost button-small">
          일반 회원 로그인
        </Link>
      </div>
    </form>
  );
}
