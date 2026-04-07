import { Link, useSearchParams } from "react-router-dom";

export function SellDonePage() {
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get("id");

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <span className="eyebrow">접수 완료</span>
        <h1 className="page-title">매물 접수가 정상적으로 완료되었습니다</h1>
        <p className="page-copy">
          운영자가 내용을 검토한 뒤 공개 여부를 결정합니다.
          {leadId ? ` 접수 번호는 #${leadId} 입니다.` : ""}
        </p>
        <div className="button-row">
          <Link to="/" className="button button-primary">
            공개 홈으로
          </Link>
          <Link to="/sell" className="button button-secondary">
            다른 매물 접수
          </Link>
        </div>
      </section>
    </div>
  );
}
