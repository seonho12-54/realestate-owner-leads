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
        throw new Error(result.error ?? "로그인에 실패했습니다.");
      }

      router.replace("/admin/leads");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "로그인에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="login-card" onSubmit={handleSubmit}>
      <div>
        <span className="eyebrow">Admin Only</span>
        <h1 className="section-title" style={{ marginTop: 14 }}>
          관리자 로그인
        </h1>
        <p className="section-copy">접수 목록, 상태 변경, 감사 로그 기록은 관리자 세션에서만 가능합니다.</p>
      </div>
      <div className="field-group">
        <label htmlFor="adminEmail">이메일</label>
        <input
          id="adminEmail"
          className="text-input"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          inputMode="email"
          autoComplete="username"
          placeholder="admin@example.com"
        />
      </div>
      <div className="field-group">
        <label htmlFor="adminPassword">비밀번호</label>
        <input
          id="adminPassword"
          className="text-input"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          placeholder="비밀번호"
        />
      </div>
      {error ? <div className="error-banner">{error}</div> : null}
      <button className="btn" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "확인 중..." : "로그인"}
      </button>
    </form>
  );
}

