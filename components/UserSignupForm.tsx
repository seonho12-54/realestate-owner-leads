"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function UserSignupForm({ nextUrl = "/" }: { nextUrl?: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, phone, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "회원가입에 실패했습니다.");
      }

      router.replace(nextUrl);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "회원가입에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <span className="eyebrow">회원가입</span>
      <h1 className="page-title">일반 회원 가입</h1>
      <p className="page-copy">다우니 계정을 만들면 위치 확인 후 매물을 등록하고, 공개된 매물을 자세히 볼 수 있습니다.</p>
      <div className="field">
        <label htmlFor="signupName">이름</label>
        <input id="signupName" className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="이름" />
      </div>
      <div className="field">
        <label htmlFor="signupEmail">이메일</label>
        <input
          id="signupEmail"
          className="input"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          inputMode="email"
          placeholder="you@example.com"
        />
      </div>
      <div className="field">
        <label htmlFor="signupPhone">전화번호</label>
        <input
          id="signupPhone"
          className="input"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          inputMode="tel"
          placeholder="010-1234-5678"
        />
      </div>
      <div className="field">
        <label htmlFor="signupPassword">비밀번호</label>
        <input
          id="signupPassword"
          className="input"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="영문과 숫자를 포함해 8자 이상"
        />
      </div>
      {error ? <div className="error-banner">{error}</div> : null}
      <button className="button button-primary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "가입 중..." : "회원가입"}
      </button>
      <div className="button-row">
        <Link href={`/login?next=${encodeURIComponent(nextUrl)}`} className="button button-secondary button-small">
          로그인
        </Link>
        <Link href="/admin/login" className="button button-ghost button-small">
          관리자 로그인
        </Link>
      </div>
    </form>
  );
}
