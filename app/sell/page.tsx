import { unstable_noStore as noStore } from "next/cache";

import { SellLeadForm } from "@/components/SellLeadForm";
import type { OfficeOption } from "@/lib/offices";
import { listActiveOffices } from "@/lib/offices";

export const dynamic = "force-dynamic";

export default async function SellPage({
  searchParams,
}: {
  searchParams?: {
    officeId?: string;
  };
}) {
  noStore();

  let offices: OfficeOption[] = [];
  let loadError: string | null = null;

  try {
    offices = await listActiveOffices();
  } catch (error) {
    loadError = error instanceof Error ? error.message : "중개사무소 정보를 불러오지 못했습니다.";
  }

  const requestedOfficeId = searchParams?.officeId ? Number(searchParams.officeId) : null;
  const initialOfficeId =
    requestedOfficeId && offices.some((office) => office.id === requestedOfficeId) ? requestedOfficeId : offices[0]?.id ?? null;

  return (
    <div className="page-stack">
      <section className="hero-card">
        <span className="eyebrow">매물 접수 폼</span>
        <h1 className="hero-title">집주인 매물을 빠르게 접수받고 바로 상담으로 이어가세요</h1>
        <p className="hero-copy">
          접수 내용은 관리자 화면에 바로 저장되며, UTM과 referrer도 함께 남아 어떤 채널에서 유입되었는지 확인할 수 있습니다.
        </p>
      </section>
      {loadError ? <div className="error-banner">{loadError}</div> : null}
      <SellLeadForm offices={offices} initialOfficeId={initialOfficeId} />
    </div>
  );
}
