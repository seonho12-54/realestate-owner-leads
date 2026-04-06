export default function PrivacyPage() {
  return (
    <div className="page-stack">
      <section className="hero-card">
        <span className="eyebrow">Privacy</span>
        <h1 className="hero-title">개인정보 처리방침</h1>
        <p className="hero-copy">매물 접수 확인과 상담 진행을 위해 필요한 최소한의 정보만 수집하고, 내부 운영 목적에 한해 사용합니다.</p>
      </section>

      <section className="section-card">
        <div className="privacy-list">
          <article className="privacy-item">
            <h3>1. 수집 항목</h3>
            <p>성함, 연락처, 이메일, 매물 주소, 거래 유형, 희망 금액, 사진, 유입 경로 정보(UTM/referrer) 등을 수집할 수 있습니다.</p>
          </article>
          <article className="privacy-item">
            <h3>2. 수집 목적</h3>
            <ul>
              <li>매물 접수 확인 및 상담 진행</li>
              <li>매물 검토와 중개 업무 대응</li>
              <li>유입 채널 분석과 광고 성과 측정</li>
            </ul>
          </article>
          <article className="privacy-item">
            <h3>3. 보관 기간</h3>
            <p>법령상 보관 의무가 없는 경우에도 접수 이력 관리와 분쟁 대응을 위해 내부 정책에 따라 일정 기간 보관할 수 있습니다.</p>
          </article>
          <article className="privacy-item">
            <h3>4. 제3자 제공</h3>
            <p>법령상 근거가 있거나 정보주체의 별도 동의가 있는 경우를 제외하고 제3자에게 제공하지 않습니다.</p>
          </article>
          <article className="privacy-item">
            <h3>5. 문의</h3>
            <p>개인정보 관련 문의는 운영 중개사무소 관리자에게 접수해 주세요.</p>
          </article>
        </div>
      </section>
    </div>
  );
}

