export function PrivacyPage() {
  return (
    <div className="page-stack">
      <section className="hero-panel compact">
        <div>
          <span className="eyebrow">Privacy</span>
          <h1 className="page-title">개인정보 처리방침</h1>
          <p className="page-copy">매물 접수, 상담 연락, 지역 검증, 관리자 운영에 필요한 최소한의 정보만 수집합니다.</p>
        </div>
      </section>

      <section className="detail-grid-shell">
        <div className="detail-card">
          <h2 className="section-title">수집 항목</h2>
          <p className="page-copy">이름, 이메일, 연락처, 매물 주소, 가격, 사진, 접속 위치 검증 결과, 유입 정보가 포함될 수 있습니다.</p>
        </div>
        <div className="detail-card">
          <h2 className="section-title">이용 목적</h2>
          <p className="page-copy">매물 등록 처리, 관리자 검토, 공개 매물 서비스 제공, 접수 이력 관리, 서비스 운영 통계를 위해 사용합니다.</p>
        </div>
        <div className="detail-card">
          <h2 className="section-title">보관 및 문의</h2>
          <p className="page-copy">법령과 내부 운영정책에 따라 보관하며, 문의는 운영 중개사무소 관리자에게 전달해 주세요.</p>
        </div>
      </section>
    </div>
  );
}
