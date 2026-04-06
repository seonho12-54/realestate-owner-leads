"use client";

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
      <span className="eyebrow">Admin Console</span>
      <h1 className="page-title">등록된 매물을 검토하고 게시 상태를 관리합니다</h1>
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
    </form>
  );
}
