import { Link, useSearchParams } from "react-router-dom";

export function SellDonePage() {
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get("id");

  return (
    <div className="page-stack">
      <section className="success-panel">
        <span className="eyebrow">등록 완료</span>
        <h1 className="page-title page-title-medium">매물 접수가 완료됐어요</h1>
        <p className="page-copy compact-copy">
          등록한 매물은 검토 후 공개 상태로 전환돼요.
          {leadId ? ` 접수 번호는 #${leadId} 입니다.` : ""}
        </p>
        <div className="button-row">
          <Link to="/" className="button button-primary">
            홈으로 이동
          </Link>
          <Link to="/me" className="button button-secondary">
            설정 보기
          </Link>
        </div>
      </section>
    </div>
  );
}
