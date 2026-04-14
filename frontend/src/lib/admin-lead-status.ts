import type { LeadStatus } from "@/lib/validation";

export const adminLeadFilters: ReadonlyArray<{
  value: LeadStatus | null;
  label: string;
  description: string;
}> = [
  { value: null, label: "전체", description: "전체 접수 매물을 한 번에 확인합니다." },
  { value: "new", label: "신규접수", description: "방금 들어온 접수만 모아 봅니다." },
  { value: "contacted", label: "연락완료", description: "연락이 끝난 건만 따로 관리합니다." },
  { value: "reviewing", label: "검토중", description: "현재 검토 중인 매물만 봅니다." },
  { value: "completed", label: "처리완료", description: "처리가 끝난 매물 보관함입니다." },
  { value: "closed", label: "반려/보류", description: "보류 또는 반려된 매물을 따로 봅니다." },
];

export function isLeadStatusFilter(value: string | undefined): value is LeadStatus {
  return value === "new" || value === "contacted" || value === "reviewing" || value === "completed" || value === "closed";
}

export function getAdminLeadsPath(status: LeadStatus | null | undefined) {
  return status ? `/admin/leads/${status}` : "/admin/leads";
}

export function getAdminLeadFilterMeta(status: LeadStatus | null | undefined) {
  return adminLeadFilters.find((filter) => filter.value === (status ?? null)) ?? adminLeadFilters[0];
}
