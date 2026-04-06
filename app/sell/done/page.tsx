import Link from "next/link";

export default function SellDonePage({
  searchParams,
}: {
  searchParams?: {
    id?: string;
  };
}) {
  return (
    <div className="page-stack">
      <section className="hero-panel">
        <span className="eyebrow">등록 완료</span>
        <h1 className="page-title">매물 등록이 접수되었습니다</h1>
        <p className="page-copy">
          관리자가 검토 후 공개 여부를 설정합니다.
          {searchParams?.id ? ` 접수 번호는 #${searchParams.id} 입니다.` : ""}
        </p>
        <div className="button-row">
          <Link href="/" className="button button-primary">
            목록으로 이동
          </Link>
          <Link href="/sell" className="button button-secondary">
            다른 매물 등록
          </Link>
        </div>
      </section>
    </div>
  );
}

