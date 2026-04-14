import { useEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";

import { Link } from "@/components/RouterLink";
import { useSession } from "@/context/SessionContext";
import { formatDateTime } from "@/lib/format";
import { getMyProfile, updateMyProfile, verifyMyPassword, type MyProfile } from "@/lib/profile";
import { useRouter } from "@/lib/router";

export function MyProfileEditPage() {
  const { session, refreshSession } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [verifiedPassword, setVerifiedPassword] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (session.isLoading || session.kind !== "user") {
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    getMyProfile()
      .then((response) => {
        if (!isMounted) {
          return;
        }

        setProfile(response);
        setName(response.name);
        setEmail(response.email);
        setError(null);
      })
      .catch((loadError) => {
        if (!isMounted) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "개인정보를 불러오지 못했어요.");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [session.isLoading, session.kind]);

  if (!session.isLoading && session.kind === "admin") {
    return <Navigate to="/admin/leads" replace />;
  }

  if (!session.isLoading && !session.authenticated) {
    return <Navigate to="/login?next=/me/profile" replace />;
  }

  async function handleVerifyPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    try {
      setIsVerifying(true);
      await verifyMyPassword(passwordInput);
      setVerifiedPassword(passwordInput);
      setPasswordInput("");
      setSuccessMessage("비밀번호 확인이 끝났어요. 이제 개인정보를 수정할 수 있어요.");
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "비밀번호 확인에 실패했어요.");
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!verifiedPassword) {
      setError("먼저 비밀번호 확인을 진행해 주세요.");
      return;
    }

    if (newPassword && newPassword !== newPasswordConfirm) {
      setError("새 비밀번호 확인이 일치하지 않아요.");
      return;
    }

    setError(null);
    setSuccessMessage(null);

    try {
      setIsSaving(true);
      const updatedProfile = await updateMyProfile({
        name,
        email,
        currentPassword: verifiedPassword,
        newPassword,
      });
      setProfile(updatedProfile);
      setName(updatedProfile.name);
      setEmail(updatedProfile.email);
      setNewPassword("");
      setNewPasswordConfirm("");
      await refreshSession();
      router.replace("/me");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "개인정보 수정에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  }

  if (session.isLoading || isLoading) {
    return (
      <div className="page-stack">
        <section className="page-panel">
          <span className="eyebrow">개인정보 수정</span>
          <h1 className="page-title page-title-medium">수정 화면을 준비하고 있어요.</h1>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="page-panel">
        <span className="eyebrow">개인정보 수정</span>
        <h1 className="page-title page-title-medium">비밀번호 확인 후 내 정보를 수정하세요</h1>
        <p className="page-copy">이름, 이메일, 비밀번호를 바꿀 수 있어요. 전화번호는 인증된 번호라서 여기서는 읽기 전용으로 보여드려요.</p>
      </section>

      {!verifiedPassword ? (
        <form className="page-panel form-grid" onSubmit={handleVerifyPassword}>
          <div>
            <h2 className="section-title">1. 비밀번호 확인</h2>
            <p className="page-copy compact-copy">개인정보 수정 전에 현재 비밀번호를 한 번 더 입력해 주세요.</p>
          </div>

          <label className="field">
            <span>현재 비밀번호</span>
            <input
              className="input"
              type="password"
              value={passwordInput}
              onChange={(event) => setPasswordInput(event.target.value)}
              autoComplete="current-password"
              placeholder="현재 비밀번호를 입력해 주세요"
            />
          </label>

          {error ? <div className="error-banner">{error}</div> : null}
          {successMessage ? <div className="success-banner">{successMessage}</div> : null}

          <div className="button-row">
            <button type="submit" className="button button-primary" disabled={isVerifying}>
              {isVerifying ? "확인 중..." : "비밀번호 확인"}
            </button>
            <Link href="/me" className="button button-secondary">
              돌아가기
            </Link>
          </div>
        </form>
      ) : null}

      {verifiedPassword ? (
        <form className="page-panel form-grid" onSubmit={handleSubmit}>
          <div>
            <h2 className="section-title">2. 개인정보 수정</h2>
            <p className="page-copy compact-copy">수정 후 저장하면 설정 화면으로 돌아가요.</p>
          </div>

          <div className="form-grid two-column">
            <label className="field">
              <span>이름</span>
              <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
            </label>

            <label className="field">
              <span>이메일</span>
              <input className="input" value={email} onChange={(event) => setEmail(event.target.value)} inputMode="email" />
            </label>

            <label className="field">
              <span>인증된 전화번호</span>
              <input className="input" value={profile?.phone ?? "-"} disabled />
            </label>

            <label className="field">
              <span>전화번호 인증 시각</span>
              <input className="input" value={profile?.phoneVerifiedAt ? formatDateTime(new Date(profile.phoneVerifiedAt)) : "인증 정보 없음"} disabled />
            </label>
          </div>

          <div className="form-grid two-column">
            <label className="field">
              <span>새 비밀번호</span>
              <input
                className="input"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                placeholder="변경할 때만 입력해 주세요"
              />
            </label>

            <label className="field">
              <span>새 비밀번호 확인</span>
              <input
                className="input"
                type="password"
                value={newPasswordConfirm}
                onChange={(event) => setNewPasswordConfirm(event.target.value)}
                autoComplete="new-password"
                placeholder="새 비밀번호를 한 번 더 입력해 주세요"
              />
            </label>
          </div>

          <div className="inline-note-list">
            <span className="inline-note">인증 지역: {profile?.verifiedRegionName ?? "지역 인증 전"}</span>
            <span className="inline-note">전화번호는 중복 가입 방지를 위해 여기서 수정하지 않아요.</span>
          </div>

          {error ? <div className="error-banner">{error}</div> : null}
          {successMessage ? <div className="success-banner">{successMessage}</div> : null}

          <div className="button-row">
            <button type="submit" className="button button-primary" disabled={isSaving}>
              {isSaving ? "저장 중..." : "개인정보 저장"}
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => {
                setVerifiedPassword(null);
                setPasswordInput("");
                setError(null);
                setSuccessMessage(null);
              }}
            >
              다시 확인하기
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
