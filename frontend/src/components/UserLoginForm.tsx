"use client";

import { useState, type FormEvent } from "react";

import { Link } from "@/components/RouterLink";
import { useSession } from "@/context/SessionContext";
import { loginUser } from "@/lib/auth";
import { useRouter } from "@/lib/router";

export function UserLoginForm({ nextUrl = "/" }: { nextUrl?: string }) {
  const router = useRouter();
  const { refreshSession } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      setIsSubmitting(true);
      await loginUser({ email, password });
      await refreshSession();
      router.replace(nextUrl);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "로그인에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-card vibrant" onSubmit={handleSubmit}>
      <span className="eyebrow">MEMBER LOGIN</span>
      <h1 className="page-title">회원 로그인</h1>
      <p className="page-copy">
        상세 페이지 확인, 매물 접수, 접수 결과 확인은 회원 로그인 이후 이어집니다. 지도와 공개 리스트는 비회원도 먼저 볼 수 있습니다.
      </p>

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
