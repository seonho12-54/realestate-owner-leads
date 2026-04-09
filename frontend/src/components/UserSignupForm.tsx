import { useState, type FormEvent } from "react";

import { Link } from "@/components/RouterLink";
import { useSession } from "@/context/SessionContext";
import { signupUser } from "@/lib/auth";
import { useRouter } from "@/lib/router";

export function UserSignupForm({ nextUrl = "/me" }: { nextUrl?: string }) {
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
      setError(submitError instanceof Error ? submitError.message : "회원가입에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-card signup-card" onSubmit={handleSubmit}>
      <span className="eyebrow">JOIN UMI</span>
      <h1 className="page-title">회원가입</h1>
      <p className="page-copy compact-copy">
        가입을 마치면 마이페이지에서 위치 인증을 한 번만 완료한 뒤 매물 접수와 수정 기능을 사용할 수 있습니다. 회원가입 단계에서는 위치 인증이 필요하지 않습니다.
      </p>

      <label className="field">
        <span>이름</span>
        <input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="이름" />
      </label>

      <label className="field">
        <span>이메일</span>
        <input className="input" value={email} onChange={(event) => setEmail(event.target.value)} inputMode="email" placeholder="name@example.com" />
      </label>

      <label className="field">
        <span>전화번호</span>
        <input className="input" value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" placeholder="010-1234-5678" />
      </label>

      <label className="field">
        <span>비밀번호</span>
        <input
          className="input"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="영문과 숫자를 포함해 8자 이상"
        />
      </label>

      {error ? <div className="error-banner">{error}</div> : null}

      <button className="button button-primary button-full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "가입 중..." : "회원가입"}
      </button>

      <div className="button-row button-row-compact">
        <Link href={`/login?next=${encodeURIComponent(nextUrl)}`} className="button button-secondary button-small">
          로그인
        </Link>
      </div>
    </form>
  );
}
