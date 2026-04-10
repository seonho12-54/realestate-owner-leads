import { useState, type FormEvent } from "react";

import { Link } from "@/components/RouterLink";
import { useSession } from "@/context/SessionContext";
import { signupUser } from "@/lib/auth";
import { useRouter } from "@/lib/router";

export function UserSignupForm({ nextUrl = "/" }: { nextUrl?: string }) {
  const router = useRouter();
  const { refreshSession } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      setIsSubmitting(true);
      await signupUser({ name, email, phone, password });
      await refreshSession();
      router.replace(nextUrl);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "회원가입에 실패했어요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <span className="eyebrow">회원가입</span>
      <h1 className="page-title page-title-medium">우리 동네 매물을 더 빠르게 받아보세요</h1>
      <p className="page-copy compact-copy">가입 후 내 동네 인증을 완료하면 우리 동네 매물만 안전하게 잠금 상태로 둘러볼 수 있어요.</p>

      <label className="field">
        <span>이름</span>
        <input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="홍길동" />
      </label>

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
        <span>연락처</span>
        <input className="input" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="010-1234-5678" />
      </label>

      <label className="field">
        <span>비밀번호</span>
        <input
          className="input"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          placeholder="영문과 숫자를 포함해 입력해 주세요"
        />
      </label>

      {error ? <div className="error-banner">{error}</div> : null}

      <button className="button button-primary button-full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "가입 중..." : "회원가입"}
      </button>

      <div className="button-row button-row-compact">
        <Link href={`/login?next=${encodeURIComponent(nextUrl)}`} className="button button-secondary button-small">
          이미 계정이 있어요
        </Link>
      </div>
    </form>
  );
}
