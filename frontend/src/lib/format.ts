const KRW = new Intl.NumberFormat("ko-KR");
const DATETIME = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function formatManUnit(value: number) {
  const eok = Math.floor(value / 100_000_000);
  const man = Math.floor((value % 100_000_000) / 10_000);

  if (eok > 0 && man > 0) {
    return `${KRW.format(eok)}억 ${KRW.format(man)}만`;
  }

  if (eok > 0) {
    return `${KRW.format(eok)}억`;
  }

  if (man > 0) {
    return `${KRW.format(man)}만`;
  }

  return `${KRW.format(Math.round(value))}원`;
}

export function formatKrw(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return `${KRW.format(Math.round(value))}원`;
}

export function formatCompactKrw(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "-";
  }

  return formatManUnit(value);
}

export function formatArea(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "-";
  }

  return `${value.toFixed(1)}㎡`;
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) {
    return "-";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return DATETIME.format(date);
}

export function getPropertyTypeLabel(value?: string | null) {
  switch (value) {
    case "apartment":
      return "아파트";
    case "officetel":
      return "오피스텔";
    case "villa":
      return "빌라/연립";
    case "house":
      return "주택/단독";
    case "commercial":
      return "상가/사무실";
    case "land":
      return "토지";
    default:
      return "기타";
  }
}

export function getTransactionTypeLabel(value?: string | null) {
  switch (value) {
    case "sale":
      return "매매";
    case "jeonse":
      return "전세";
    case "monthly":
      return "월세";
    case "consult":
      return "상담";
    default:
      return "거래";
  }
}

export function formatTradeLabel(value: {
  transactionType: string;
  priceKrw?: number | null;
  depositKrw?: number | null;
  monthlyRentKrw?: number | null;
}) {
  if (value.transactionType === "sale") {
    return `매매 ${formatCompactKrw(value.priceKrw)}`;
  }

  if (value.transactionType === "jeonse") {
    return `전세 ${formatCompactKrw(value.depositKrw)}`;
  }

  if (value.transactionType === "monthly") {
    return `월세 ${formatCompactKrw(value.depositKrw)} / ${formatCompactKrw(value.monthlyRentKrw)}`;
  }

  return "상담 문의";
}
