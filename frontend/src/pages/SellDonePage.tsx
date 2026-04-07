import { Link, useSearchParams } from "react-router-dom";

export function SellDonePage() {
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get("id");

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <span className="eyebrow">등록 완료</span>
        <h1 className="page-title">매물 등록이 접수되었습니다</h1>
        <p className="page-copy">관리자가 검토 후 공개 여부를 결정합니다.{leadId ? ` 접수 번호는 #${leadId} 입니다.` : ""}</p>
        <div className="button-row">
          <Link to="/" className="button button-primary">
            목록으로 이동
          </Link>
          <Link to="/sell" className="button button-secondary">
            다른 매물 등록
          </Link>
        </div>
      </section>
    </div>
  );
}
