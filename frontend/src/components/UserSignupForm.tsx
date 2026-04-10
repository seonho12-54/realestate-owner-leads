import { useState, type FormEvent } from "react";

import { Link } from "@/components/RouterLink";
import { useSession } from "@/context/SessionContext";
import { confirmSignupPhoneVerification, requestSignupPhoneVerification, signupUser } from "@/lib/auth";
import { useRouter } from "@/lib/router";

export function UserSignupForm({ nextUrl = "/" }: { nextUrl?: string }) {
  const router = useRouter();
  const { refreshSession } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationKey, setVerificationKey] = useState<string | null>(null);
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isCheckingCode, setIsCheckingCode] = useState(false);

  function handlePhoneChange(nextPhone: string) {
    setPhone(nextPhone);
    setNotice(null);
    setError(null);

    if (verifiedPhone && verifiedPhone !== nextPhone.trim()) {
      setVerifiedPhone(null);
      setVerificationKey(null);
      setVerificationCode("");
    }
  }

  async function handleSendCode() {
    setError(null);
    setNotice(null);

    try {
      setIsSendingCode(true);
      const response = await requestSignupPhoneVerification(phone);
      setVerificationKey(response.verificationKey);
      setVerifiedPhone(null);
      setVerificationCode("");
      setNotice("인증번호를 보냈어요. 문자로 받은 번호를 아래에 입력해 주세요.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "인증번호 전송에 실패했어요.");
    } finally {
      setIsSendingCode(false);
    }
  }

  async function handleVerifyCode() {
    if (!verificationKey) {
      setError("먼저 인증번호를 요청해 주세요.");
      return;
    }

    setError(null);
    setNotice(null);

    try {
      setIsCheckingCode(true);
      await confirmSignupPhoneVerification(phone, verificationKey, verificationCode);
      setVerifiedPhone(phone.trim());
      setNotice("전화번호 인증이 완료됐어요.");
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : "인증번호 확인에 실패했어요.");
    } finally {
      setIsCheckingCode(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!verificationKey || verifiedPhone !== phone.trim()) {
      setError("전화번호 인증을 먼저 완료해 주세요.");
      return;
    }

    try {
      setIsSubmitting(true);
      await signupUser({ name, email, phone, password, phoneVerificationKey: verificationKey });
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
      <h1 className="page-title page-title-medium">다우니 동네 매물을 더 안전하게 둘러보세요.</h1>
      <p className="page-copy compact-copy">이제 회원가입 전에 전화번호 인증을 마쳐야 하고, 인증된 번호는 한 번만 가입할 수 있어요.</p>

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
        <span>휴대전화</span>
        <input
          className="input"
          value={phone}
          onChange={(event) => handlePhoneChange(event.target.value)}
          placeholder="010-1234-5678"
          autoComplete="tel"
        />
      </label>

      <div className="button-row button-row-compact">
        <button type="button" className="button button-secondary button-small" onClick={() => void handleSendCode()} disabled={isSendingCode}>
          {isSendingCode ? "전송 중..." : "인증번호 받기"}
        </button>
        {verifiedPhone === phone.trim() ? (
          <button
            type="button"
            className="button button-ghost button-small"
            onClick={() => {
              setVerifiedPhone(null);
              setVerificationKey(null);
              setVerificationCode("");
              setNotice(null);
            }}
          >
            번호 다시 입력
          </button>
        ) : null}
      </div>

      <label className="field">
        <span>인증번호</span>
        <input
          className="input"
          value={verificationCode}
          onChange={(event) => setVerificationCode(event.target.value)}
          placeholder="문자로 받은 인증번호"
          inputMode="numeric"
        />
      </label>

      <div className="button-row button-row-compact">
        <button
          type="button"
          className="button button-secondary button-small"
          onClick={() => void handleVerifyCode()}
          disabled={isCheckingCode || !verificationKey}
        >
          {isCheckingCode ? "확인 중..." : "인증 확인"}
        </button>
        {verifiedPhone === phone.trim() ? <span className="inline-note success">전화번호 인증 완료</span> : null}
      </div>

      <label className="field">
        <span>비밀번호</span>
        <input
          className="input"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          placeholder="영문과 숫자를 포함해 입력해 주세요."
        />
      </label>

      {notice ? <div className="success-banner">{notice}</div> : null}
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
