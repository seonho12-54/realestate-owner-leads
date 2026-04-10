import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";

import { Link } from "@/components/RouterLink";
import { useSession } from "@/context/SessionContext";
import { formatArea, formatTradeLabel } from "@/lib/format";
import { readRecentListingIds, readSavedListingIds } from "@/lib/listing-prefs";
import { listMyLeads, listPublishedListings, type MyLeadSummary, type PublicListing } from "@/lib/leads";
import { reverifyLocation } from "@/lib/region";

export function MyPagePage() {
  const { session, refreshSession } = useSession();
  const [myLeads, setMyLeads] = useState<MyLeadSummary[]>([]);
  const [savedListingsSource, setSavedListingsSource] = useState<PublicListing[]>([]);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [savedError, setSavedError] = useState<string | null>(null);
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

  useEffect(() => {
    if (session.kind !== "user" || !session.region.locked) {
      setSavedListingsSource([]);
      setSavedError(null);
      return;
    }

    let isMounted = true;

    listPublishedListings()
      .then((response) => {
        if (!isMounted) {
          return;
        }

        setSavedListingsSource(response);
        setSavedError(null);
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setSavedListingsSource([]);
        setSavedError(error instanceof Error ? error.message : "찜한 매물을 불러오지 못했어요.");
      });

    return () => {
      isMounted = false;
    };
  }, [session.kind, session.region.locked]);

  const savedIds = useMemo(() => readSavedListingIds(), [session.kind, session.region.locked, savedListingsSource.length]);
  const recentIds = useMemo(() => readRecentListingIds(), [session.kind, session.region.locked, savedListingsSource.length]);
  const savedListings = useMemo(
    () => savedListingsSource.filter((listing) => savedIds.includes(listing.id)),
    [savedIds, savedListingsSource],
  );
  const recentListings = useMemo(
    () => recentIds.map((id) => savedListingsSource.find((listing) => listing.id === id)).filter(Boolean) as PublicListing[],
    [recentIds, savedListingsSource],
  );

  async function handleReverify() {
    if (!navigator.geolocation) {
      setInfoMessage("이 기기에서는 위치 인증을 사용할 수 없어요.");
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
          setInfoMessage("지역 재인증이 완료됐어요.");
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

  if (!session.isLoading && session.kind === "admin") {
    return <Navigate to="/admin/leads" replace />;
  }

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <span className="eyebrow">설정</span>
          <h1 className="page-title page-title-medium">계정, 위치 인증, 찜한 매물을 한곳에서 확인해 보세요</h1>
          <p className="page-copy">
            설정 화면에서 지역 재인증을 하고, 개인정보를 수정하고, 탐색 중 찜해 둔 매물도 바로 다시 볼 수 있어요.
          </p>
        </div>
      </section>

      <section className="settings-grid">
        <article className="settings-card">
          <span className="eyebrow">지역 인증</span>
          <strong>{session.region.region?.name ?? "아직 인증 전"}</strong>
          <p>
            {session.region.locked
              ? "현재 계정은 인증된 지역으로 잠겨 있어요."
              : "우리 동네 인증을 완료하면 해당 지역 매물만 빠르게 볼 수 있어요."}
          </p>
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
          <p>{session.user?.email ?? "로그인 후 개인정보 수정과 찜한 매물 관리를 이용할 수 있어요."}</p>
          {session.authenticated ? (
            <>
              <div className="button-row">
                <Link href="/me/profile" className="button button-primary">
                  개인정보 수정
                </Link>
              </div>
              <p className="page-copy compact-copy">개인정보 수정 전에는 비밀번호를 먼저 확인해요.</p>
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

        <article className="settings-card">
          <span className="eyebrow">찜한 매물</span>
          <strong>{savedListings.length}개</strong>
          <p>둘러보기나 상세에서 찜한 매물을 여기에서 다시 확인할 수 있어요.</p>
          <div className="button-row">
            <Link href="/saved" className="button button-primary">
              찜 목록 전체 보기
            </Link>
          </div>
        </article>
      </section>

      {session.kind === "user" ? (
        <>
          <section className="saved-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">찜한 매물</span>
                <h2 className="section-title">설정에서 바로 보는 찜 목록</h2>
              </div>
              <Link href="/saved" className="button button-secondary button-small">
                전체 보기
              </Link>
            </div>

            {savedError ? (
              <div className="error-banner">{savedError}</div>
            ) : !session.region.locked ? (
              <div className="empty-panel">
                <strong>지역 인증 후 찜한 매물을 볼 수 있어요.</strong>
                <p>내 동네 인증을 완료하면 찜한 매물과 최근 본 매물이 같이 열립니다.</p>
              </div>
            ) : savedListings.length === 0 ? (
              <div className="empty-panel">
                <strong>아직 찜한 매물이 없어요.</strong>
                <p>탐색 화면에서 찜하기를 누르면 이곳에 모아 보여드려요.</p>
              </div>
            ) : (
              <div className="saved-card-grid">
                {savedListings.map((listing) => (
                  <Link key={listing.id} href={`/listings/${listing.id}`} className="saved-card">
                    <strong>{listing.listingTitle}</strong>
                    <span>{formatTradeLabel(listing)}</span>
                    <span>{formatArea(listing.areaM2)}</span>
                    <span>{listing.region3DepthName ?? "인증 지역 매물"}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="saved-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">최근 본 매물</span>
                <h2 className="section-title">최근에 확인한 매물도 다시 볼 수 있어요</h2>
              </div>
            </div>

            {!session.region.locked ? (
              <div className="empty-panel">
                <strong>지역 인증 후 최근 본 매물을 볼 수 있어요.</strong>
                <p>인증이 완료되면 매물 상세를 본 기록이 여기에 쌓입니다.</p>
              </div>
            ) : recentListings.length === 0 ? (
              <div className="empty-panel">
                <strong>아직 최근 본 매물이 없어요.</strong>
                <p>매물 상세를 보면 자동으로 최근 목록에 추가됩니다.</p>
              </div>
            ) : (
              <div className="saved-card-grid">
                {recentListings.map((listing) => (
                  <Link key={listing.id} href={`/listings/${listing.id}`} className="saved-card">
                    <strong>{listing.listingTitle}</strong>
                    <span>{formatTradeLabel(listing)}</span>
                    <span>{listing.region3DepthName ?? "인증 지역 매물"}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

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
        </>
      ) : null}
    </div>
  );
}
