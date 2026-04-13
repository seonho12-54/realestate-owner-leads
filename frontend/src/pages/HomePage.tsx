import { useEffect, useMemo, useState } from "react";

import { MarketplaceShell } from "@/components/MarketplaceShell";
import { Link } from "@/components/RouterLink";
import { useSession } from "@/context/SessionContext";
import { ApiError } from "@/lib/api";
import { formatArea, formatTradeLabel, getPropertyTypeLabel } from "@/lib/format";
import { listPreviewListings, listPublishedListings, type PublicListing } from "@/lib/leads";
import { verifyLocation } from "@/lib/region";
import { SERVICE_AREAS } from "@/lib/service-area";

export function HomePage() {
  const { session, refreshSession } = useSession();
  const [listings, setListings] = useState<PublicListing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  const lockedRegion = session.region.region;
  const previewListings = useMemo(() => listings.slice(0, 3), [listings]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const loader = session.region.locked ? listPublishedListings() : listPreviewListings(6);

    loader
      .then((response) => {
        if (!isMounted) {
          return;
        }

        setListings(response);
        setError(null);
      })
      .catch((loadError) => {
        if (!isMounted) {
          return;
        }

        if (loadError instanceof ApiError && loadError.code === "REGION_VERIFICATION_REQUIRED") {
          setListings([]);
          setError(null);
          return;
        }

        setListings([]);
        setError(loadError instanceof Error ? loadError.message : "매물 목록을 불러오지 못했어요.");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [session.region.locked]);

  async function handleVerify() {
    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      setVerifyMessage("위치 인증은 HTTPS 환경에서만 사용할 수 있어요.");
      return;
    }

    if (!navigator.geolocation) {
      setVerifyMessage("이 기기에서는 위치 서비스를 사용할 수 없어요.");
      return;
    }

    setIsVerifying(true);
    setVerifyMessage("현재 위치를 확인하고 있어요...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await verifyLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          await refreshSession();
          setVerifyMessage("📍 내 동네 인증이 완료됐어요. 이제 인증한 지역 매물만 보여드릴게요.");
        } catch (verifyError) {
          setVerifyMessage(verifyError instanceof Error ? verifyError.message : "위치 인증에 실패했어요.");
        } finally {
          setIsVerifying(false);
        }
      },
      (geoError) => {
        setIsVerifying(false);
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setVerifyMessage("위치 권한을 허용한 뒤 다시 시도해 주세요.");
          return;
        }

        setVerifyMessage("현재 위치를 가져오지 못했어요. 잠시 후 다시 시도해 주세요.");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 1000 * 60 * 5,
      },
    );
  }

  if (session.isLoading || isLoading) {
    return (
      <div className="page-stack">
        <section className="page-panel">
          <span className="eyebrow">로딩 중</span>
          <h1 className="page-title page-title-medium">우리 동네 매물을 준비하고 있어요</h1>
          <p className="page-copy">잠시만 기다려 주세요...</p>
        </section>
      </div>
    );
  }

  if (!session.region.locked || !lockedRegion) {
    return (
      <div className="page-stack">
        {/* Hero: Onboarding */}
        <section
          className="page-panel"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(240,246,255,0.9) 100%)",
            border: "1px solid rgba(26,58,110,0.1)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.7fr 0.9fr",
              gap: 28,
              alignItems: "start",
            }}
          >
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className="eyebrow">동네 기반 부동산</span>
                <span className="eyebrow accent">한 번만 인증</span>
              </div>
              <h1
                className="page-title"
                style={{
                  background: "linear-gradient(135deg, #0f2548, #1e4d9b)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                내 동네 인증하고 우리 동네 매물만 빠르게 보세요
              </h1>
              <p className="page-copy">
                다우니는 위치 인증을 완료한 지역의 매물만 보여드리는 로컬 부동산 서비스예요.
                인증한 지역의 매물을 지도와 목록에서 안전하게 비교할 수 있어요.
              </p>

              <div className="button-row" style={{ marginTop: 4 }}>
                <button
                  type="button"
                  id="verify-location-btn"
                  className="button button-primary"
                  onClick={handleVerify}
                  disabled={isVerifying}
                  style={{ minWidth: 160 }}
                >
                  {isVerifying ? "📡 인증 중..." : "📍 내 동네 인증하기"}
                </button>
                <Link href="/explore" className="button button-secondary">
                  미리보기 둘러보기
                </Link>
              </div>

              {verifyMessage ? (
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: 14,
                    background: verifyMessage.includes("완료") ? "var(--success-soft)" : "rgba(26,58,110,0.06)",
                    color: verifyMessage.includes("완료") ? "var(--success-strong)" : "var(--muted)",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    border: `1px solid ${verifyMessage.includes("완료") ? "rgba(16,185,129,0.2)" : "var(--line)"}`,
                  }}
                >
                  {verifyMessage}
                </div>
              ) : null}
            </div>

            {/* Right: Service area */}
            <div
              style={{
                display: "grid",
                gap: 14,
                padding: 20,
                borderRadius: 18,
                background: "linear-gradient(135deg, rgba(26,58,110,0.06), rgba(30,77,155,0.1))",
                border: "1px solid rgba(26,58,110,0.1)",
              }}
            >
              <div>
                <span className="eyebrow" style={{ fontSize: "0.68rem" }}>인증 가능 지역</span>
                <p style={{ marginTop: 8, fontWeight: 700, fontSize: "1rem", color: "var(--primary)" }}>
                  지원 지역
                </p>
              </div>
              <ul className="simple-list">
                {SERVICE_AREAS.map((area) => (
                  <li key={area.slug}>{area.name}</li>
                ))}
              </ul>
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.7)",
                  fontSize: "0.8rem",
                  color: "var(--muted)",
                  lineHeight: 1.6,
                }}
              >
                🔒 지도에는 정확한 집 위치 대신 주변 권역만 표시해요
              </div>
            </div>
          </div>

          {/* 3-step guide */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 14,
              marginTop: 8,
              paddingTop: 20,
              borderTop: "1px solid var(--line)",
            }}
          >
            {[
              { step: "01", icon: "📍", title: "동네 인증", desc: "현재 위치로 인증 지역을 설정해요" },
              { step: "02", icon: "🏘️", title: "매물 탐색", desc: "인증 지역의 매물만 비교해 볼 수 있어요" },
              { step: "03", icon: "❤️", title: "찜하고 문의", desc: "마음에 드는 매물을 찜하고 상담 문의해요" },
            ].map((item) => (
              <div
                key={item.step}
                style={{
                  display: "grid",
                  gap: 8,
                  padding: 18,
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.7)",
                  border: "1px solid var(--line)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 900,
                      color: "var(--accent)",
                      letterSpacing: "0.05em",
                    }}
                  >
                    STEP {item.step}
                  </span>
                </div>
                <div style={{ fontSize: "1.5rem" }}>{item.icon}</div>
                <strong style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", letterSpacing: "-0.03em" }}>
                  {item.title}
                </strong>
                <p style={{ color: "var(--muted)", fontSize: "0.84rem", lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {error ? (
          <section className="page-panel">
            <span className="eyebrow">미리보기 오류</span>
            <h2 className="section-title">실시간 미리보기를 불러오지 못했어요</h2>
            <p className="page-copy compact-copy">{error}</p>
          </section>
        ) : null}

        {/* Preview listings */}
        <section className="saved-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">실 데이터 미리보기</span>
              <h2 className="section-title">인증 전에도 실제 매물을 먼저 볼 수 있어요</h2>
            </div>
            <Link href="/explore" className="button button-secondary button-small">
              전체 미리보기 보기 →
            </Link>
          </div>

          {previewListings.length === 0 ? (
            <div className="empty-panel">
              <strong>🏠 미리보기 매물이 아직 없어요</strong>
              <p>잠시 후 다시 확인해 주세요.</p>
            </div>
          ) : (
            <div className="preview-card-grid">
              {previewListings.map((listing) => (
                <article key={listing.id} className="preview-card">
                  {listing.previewPhotoUrl ? (
                    <img className="preview-card-thumb" src={listing.previewPhotoUrl} alt={listing.listingTitle} />
                  ) : (
                    <div className="preview-card-thumb empty">사진 준비 중</div>
                  )}
                  <span className="preview-badge">미리보기 매물</span>
                  <strong className="preview-card-price">{formatTradeLabel(listing)}</strong>
                  <strong style={{ fontSize: "0.95rem", letterSpacing: "-0.03em" }}>
                    {listing.region3DepthName ?? "인증 가능 지역"} · {getPropertyTypeLabel(listing.propertyType)}
                  </strong>
                  <span style={{ color: "var(--muted)", fontSize: "0.86rem" }}>{formatArea(listing.areaM2)}</span>
                  <p
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--muted)",
                      padding: "8px 12px",
                      background: "rgba(26,58,110,0.05)",
                      borderRadius: 10,
                    }}
                  >
                    🔒 상세 주소는 문의 후 안내됩니다
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-stack">
        <section className="page-panel">
          <span className="eyebrow">불러오기 실패</span>
          <h1 className="page-title page-title-medium">인증 지역 매물을 가져오지 못했어요</h1>
          <p className="page-copy compact-copy">{error}</p>
        </section>
      </div>
    );
  }

  return (
    <MarketplaceShell
      listings={listings}
      regionName={lockedRegion.name}
      title={`${lockedRegion.neighborhood}에서 바로 비교해 보세요`}
      description="가격, 거래방식, 지역, 면적을 먼저 보고 지도와 목록을 함께 비교할 수 있어요."
      emptyTitle="인증한 지역에 공개된 매물이 아직 없어요."
      emptyDescription="잠시 후 다시 확인하거나 새 매물 등록을 기다려 주세요."
    />
  );
}
