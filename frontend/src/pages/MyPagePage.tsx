import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import { Link } from "@/components/RouterLink";
import { useSession } from "@/context/SessionContext";
import { formatArea, formatTradeLabel } from "@/lib/format";
import { listMyLeads, type MyLeadSummary } from "@/lib/leads";
import { reverifyLocation } from "@/lib/region";

export function MyPagePage() {
  const { session, refreshSession } = useSession();
  const [myLeads, setMyLeads] = useState<MyLeadSummary[]>([]);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isReverifying, setIsReverifying] = useState(false);

  useEffect(() => {
    if (session.kind !== "user") {
      setMyLeads([]);
      return;
    }

    let isMounted = true;
    listMyLeads()
      .then((response) => {
        if (isMounted) {
          setMyLeads(response);
        }
      })
      .catch(() => {
        if (isMounted) {
          setMyLeads([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [session.kind]);

  if (!session.isLoading && session.kind === "admin") {
    return <Navigate to="/admin/leads" replace />;
  }

  async function handleReverify() {
    if (!navigator.geolocation) {
      setInfoMessage("이 기기에서는 위치 재인증을 사용할 수 없어요.");
      return;
    }

    setIsReverifying(true);
    setInfoMessage("현재 위치로 다시 인증하고 있어요...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await reverifyLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          await refreshSession();
          setInfoMessage("지역 재인증이 완료되었어요.");
        } catch (error) {
          setInfoMessage(error instanceof Error ? error.message : "지역 재인증에 실패했어요.");
        } finally {
          setIsReverifying(false);
        }
      },
      () => {
        setIsReverifying(false);
        setInfoMessage("현재 위치를 가져오지 못했어요.");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
      },
    );
  }

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <span className="eyebrow">내 설정</span>
          <h1 className="page-title page-title-medium">지역 잠금 상태와 내 계정 정보를 확인하세요</h1>
          <p className="page-copy">지역이 바뀌었거나 개인정보를 수정해야 할 때 이 화면에서 다시 확인할 수 있어요.</p>
        </div>
      </section>

      <section className="settings-grid">
        <article className="settings-card">
          <span className="eyebrow">지역 잠금</span>
          <strong>{session.region.region?.name ?? "아직 인증 전"}</strong>
          <p>{session.region.locked ? "현재 계정은 인증한 지역으로 잠겨 있어요." : "우리 동네 인증을 마치면 해당 지역으로 잠겨요."}</p>
          <div className="button-row">
            <button type="button" className="button button-primary" onClick={handleReverify} disabled={isReverifying}>
              {isReverifying ? "재인증 중..." : "지역 다시 인증하기"}
            </button>
            {!session.authenticated ? (
              <Link href="/login" className="button button-secondary">
                로그인
              </Link>
            ) : null}
          </div>
          {infoMessage ? <p className="page-copy compact-copy">{infoMessage}</p> : null}
        </article>

        <article className="settings-card">
          <span className="eyebrow">계정</span>
          <strong>{session.user?.name ?? "비회원 둘러보기"}</strong>
          <p>{session.user?.email ?? "로그인 전에는 지역 인증 상태만 확인할 수 있어요."}</p>

          {session.authenticated ? (
            <>
              <div className="button-row">
                <Link href="/me/profile" className="button button-primary">
                  개인정보 수정
                </Link>
              </div>
              <p className="page-copy compact-copy">개인정보 수정 전에 비밀번호를 한 번 더 확인해요.</p>
            </>
          ) : (
            <div className="button-row">
              <Link href="/login" className="button button-primary">
                로그인
              </Link>
              <Link href="/signup" className="button button-secondary">
                회원가입
              </Link>
            </div>
          )}
        </article>
      </section>

      {session.kind === "user" ? (
        <section className="saved-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">내 매물</span>
              <h2 className="section-title">등록한 매물</h2>
            </div>
          </div>

          {myLeads.length === 0 ? (
            <div className="empty-panel">
              <strong>아직 등록한 매물이 없어요.</strong>
              <p>문의 등록에서 첫 매물을 등록해 보세요.</p>
            </div>
          ) : (
            <div className="saved-card-grid">
              {myLeads.map((lead) => (
                <Link key={lead.id} href={`/listings/${lead.id}`} className="saved-card">
                  <strong>{lead.listingTitle}</strong>
                  <span>{formatTradeLabel(lead)}</span>
                  <span>{formatArea(lead.areaM2)}</span>
                  <span>{lead.region3DepthName ?? "우리 동네"}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
