import { Link, useSearchParams } from "react-router-dom";

export function SellDonePage() {
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get("id");

  return (
    <div className="page-stack">
      <section className="success-panel">
        <span className="eyebrow">접수 완료</span>
        <h1 className="page-title page-title-medium">매물 접수가 완료되었습니다.</h1>
        <p className="page-copy compact-copy">
          관리자가 접수 내용을 확인한 뒤 연락드릴 예정입니다.
          {leadId ? ` 접수 번호는 #${leadId} 입니다.` : ""}
        </p>
        <div className="button-row">
          <Link to="/" className="button button-primary">
            홈으로 이동
          </Link>
        </div>
      </section>
    </div>
  );
}
