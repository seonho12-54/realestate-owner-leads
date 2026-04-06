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
      <section className="hero-card">
        <span className="eyebrow">접수 완료</span>
        <h1 className="hero-title">매물 접수가 정상적으로 등록되었습니다</h1>
        <p className="hero-copy">
          담당 중개사가 내용을 검토한 뒤 입력하신 연락처로 확인 연락을 드립니다.
          {searchParams?.id ? ` 접수 번호는 #${searchParams.id}입니다.` : ""}
        </p>
        <div className="cta-row">
          <Link href="/" className="btn">
            홈으로
          </Link>
          <Link href="/sell" className="btn-secondary">
            다른 매물 접수
          </Link>
        </div>
      </section>
    </div>
  );
}

