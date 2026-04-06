import { propertyTypeOptions, transactionTypeOptions } from "@/lib/validation";

const propertyTypeLabelMap = Object.fromEntries(propertyTypeOptions.map((option) => [option.value, option.label]));
const transactionTypeLabelMap = Object.fromEntries(transactionTypeOptions.map((option) => [option.value, option.label]));

export function formatKrw(value: number | null): string {
  if (value === null) {
    return "-";
  }

  return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}

export function formatCompactKrw(value: number | null): string {
  if (value === null) {
    return "-";
  }

  if (value >= 100000000) {
    const eok = Math.floor(value / 100000000);
    const rest = value % 100000000;

    if (rest === 0) {
      return `${eok}억`;
    }

    return `${eok}억 ${Math.floor(rest / 10000).toLocaleString("ko-KR")}만`;
  }

  if (value >= 10000) {
    return `${Math.floor(value / 10000).toLocaleString("ko-KR")}만`;
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

export function formatTradeLabel(params: {
  transactionType: string;
  priceKrw: number | null;
  depositKrw: number | null;
  monthlyRentKrw: number | null;
}): string {
  const transactionLabel = transactionTypeLabelMap[params.transactionType] ?? params.transactionType;

  if (params.transactionType === "sale") {
    return `${transactionLabel} ${formatCompactKrw(params.priceKrw)}`;
  }

  if (params.transactionType === "jeonse") {
    return `${transactionLabel} ${formatCompactKrw(params.depositKrw)}`;
  }

  if (params.transactionType === "monthly") {
    return `${transactionLabel} ${formatCompactKrw(params.depositKrw)} / ${formatCompactKrw(params.monthlyRentKrw)}`;
  }

  return transactionLabel;
}

export function getPropertyTypeLabel(value: string): string {
  return propertyTypeLabelMap[value] ?? value;
}

export function getTransactionTypeLabel(value: string): string {
  return transactionTypeLabelMap[value] ?? value;
}

