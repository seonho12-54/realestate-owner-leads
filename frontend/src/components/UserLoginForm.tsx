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
      setError(submitError instanceof Error ? submitError.message : "로그인에 실패했어요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <span className="eyebrow">로그인</span>
      <h1 className="page-title page-title-medium">우리 동네 매물을 다시 이어보세요</h1>
      <p className="page-copy compact-copy">로그인하면 인증한 지역 잠금 상태와 저장한 매물을 그대로 이어서 볼 수 있어요.</p>

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
          placeholder="비밀번호를 입력해주세요"
        />
      </label>

      {error ? <div className="error-banner">{error}</div> : null}

      <button className="button button-primary button-full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "로그인 중..." : "로그인"}
      </button>

      <div className="button-row button-row-compact">
        <Link href={`/signup?next=${encodeURIComponent(nextUrl)}`} className="button button-secondary button-small">
          회원가입
        </Link>
      </div>
    </form>
  );
}
