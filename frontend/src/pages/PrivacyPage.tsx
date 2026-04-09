export function PrivacyPage() {
  return (
    <div className="page-stack">
      <section className="page-panel">
        <span className="eyebrow">개인정보 처리방침</span>
        <h1 className="page-title page-title-medium">개인정보 처리방침</h1>
        <p className="page-copy compact-copy">
          본 서비스는 매물 접수, 위치 인증, 관리자 검토와 연락 안내를 위해 필요한 최소한의 개인정보만 수집하고 운영 목적 범위 안에서만 사용합니다.
        </p>
      </section>

      <section className="detail-grid-shell">
        <div className="detail-card">
          <h2 className="section-title">수집 항목</h2>
          <p className="page-copy">이름, 연락처, 이메일, 매물 주소, 거래 정보, 업로드한 사진, 위치 인증 결과, 접속 및 유입 경로 정보를 수집할 수 있습니다.</p>
        </div>
        <div className="detail-card">
          <h2 className="section-title">이용 목적</h2>
          <p className="page-copy">매물 접수 처리, 관리자 검토 및 공개 반영, 연락 안내, 운영 기록 관리와 서비스 상태 확인을 위해 사용합니다.</p>
        </div>
        <div className="detail-card">
          <h2 className="section-title">보관 및 문의</h2>
          <p className="page-copy">관련 법령과 내부 운영 정책에 따라 보관하며, 개인정보 문의는 운영 중인 중개사무소 관리자에게 전달해 주세요.</p>
        </div>
      </section>
    </div>
  );
}
