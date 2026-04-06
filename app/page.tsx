import Link from "next/link";

export default function HomePage() {
  return (
    <div className="page-stack">
      <section className="hero-card">
        <span className="eyebrow">Owner Lead Intake</span>
        <h1 className="hero-title">집주인 매물 접수를 더 빠르게, 관리자 확인은 더 단순하게</h1>
        <p className="hero-copy">
          공개 매물 사이트가 아니라, 집주인에게서 바로 매물을 접수받고 중개사무소 내부에서 관리하는 데 집중한 웹앱입니다.
          불필요한 회원가입, 채팅, 결제 없이 접수와 후속 대응 흐름만 남겼습니다.
        </p>
        <div className="cta-row">
          <Link href="/sell" className="btn">
            매물 접수 시작
          </Link>
          <Link href="/admin/login" className="btn-secondary">
            관리자 로그인
          </Link>
        </div>
      </section>

      <section className="section-card">
        <h2 className="section-title">핵심 흐름</h2>
        <p className="section-copy">한 번의 접수에서 필요한 정보와 사진을 받고, 관리자 화면에서 바로 상태를 관리할 수 있도록 구성했습니다.</p>
        <div className="feature-grid">
          <article className="feature-item">
            <h3>집주인 전용 접수 폼</h3>
            <p>주소, 거래 유형, 금액, 연락 가능 시간, 사진까지 모바일에서 바로 입력할 수 있습니다.</p>
          </article>
          <article className="feature-item">
            <h3>관리자 접수 현황 화면</h3>
            <p>신규 접수부터 처리 완료까지 상태를 바꾸고, 유입 경로와 첨부 사진 수를 함께 확인합니다.</p>
          </article>
          <article className="feature-item">
            <h3>AWS 배포 준비</h3>
            <p>RDS, S3 presigned upload, Dockerfile, App Runner 설정 파일까지 포함해 운영 이전 단계까지 맞췄습니다.</p>
          </article>
        </div>
      </section>

      <section className="section-card">
        <h2 className="section-title">의도적으로 제외한 기능</h2>
        <p className="section-copy">
          이 앱은 접수 업무에 집중하도록 설계되어 있습니다. 공개 매물 검색, 회원가입, 1:1 채팅, 결제 기능은 포함하지 않습니다.
        </p>
      </section>
    </div>
  );
}

