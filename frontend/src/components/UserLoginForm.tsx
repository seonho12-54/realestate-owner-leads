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
      const result = await loginUser({ email, password });
      await refreshSession();

      if (result.kind === "admin") {
        router.replace("/admin/leads");
        return;
      }

      router.replace(nextUrl);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "로그인에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <span className="eyebrow">COMMON LOGIN</span>
      <h1 className="page-title">로그인</h1>
      <p className="page-copy compact-copy">
        일반 회원과 관리자 모두 이 로그인 화면을 사용합니다. 관리자 계정이면 자동으로 관리자 모드로 이동하고, 일반 회원이면 마이페이지와 매물 접수 기능을 사용할 수 있습니다.
      </p>

      <label className="field">
        <span>이메일</span>
        <input
          className="input"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          inputMode="email"
          autoComplete="username"
          placeholder="name@example.com"
        />
      </label>

      <label className="field">
        <span>비밀번호</span>
        <input
          className="input"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          placeholder="비밀번호"
        />
      </label>

      {error ? <div className="error-banner">{error}</div> : null}

      <button className="button button-primary button-full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "로그인 중..." : "로그인"}
      </button>

      <div className="button-row button-row-compact">
        <Link href={`/signup?next=${encodeURIComponent("/me")}`} className="button button-secondary button-small">
          회원가입
        </Link>
      </div>
    </form>
  );
}
