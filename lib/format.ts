export function formatKrw(value: number | null): string {
  if (value === null) {
    return "-";
  }

  return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}

export function formatArea(value: number | null): string {
  if (value === null) {
    return "-";
  }

  return `${new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 2,
  }).format(value)}㎡`;
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

