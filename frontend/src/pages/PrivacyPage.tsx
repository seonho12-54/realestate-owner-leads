export function PrivacyPage() {
  return (
    <div className="page-stack">
      <section className="page-panel">
        <span className="eyebrow">개인정보 처리방침</span>
        <h1 className="page-title page-title-medium">개인정보 처리방침</h1>
        <p className="page-copy compact-copy">
          본 서비스는 지역 인증, 매물 등록, 문의 연결을 위해 필요한 최소한의 개인정보만 수집하고 운영 목적 범위 안에서만 사용합니다.
        </p>
      </section>

      <section className="detail-grid-shell">
        <div className="detail-card">
          <h2 className="section-title">수집 항목</h2>
          <p className="page-copy">이름, 연락처, 이메일, 매물 주소, 거래 정보, 업로드한 사진, 위치 인증 결과, 접속 기록을 수집할 수 있습니다.</p>
        </div>
        <div className="detail-card">
          <h2 className="section-title">이용 목적</h2>
          <p className="page-copy">매물 등록 처리, 위치 인증, 문의 연결, 서비스 운영과 보안 점검을 위해 사용합니다.</p>
        </div>
        <div className="detail-card">
          <h2 className="section-title">문의</h2>
          <p className="page-copy">개인정보 관련 문의는 운영 중인 중개사무소 또는 관리자에게 전달해주세요.</p>
        </div>
      </section>
    </div>
  );
}
