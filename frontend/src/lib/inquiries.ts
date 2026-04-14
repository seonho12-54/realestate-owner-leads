import { apiRequest } from "@/lib/api";

export type InquirySummary = {
  id: number;
  title: string;
  authorName: string;
  secret: boolean;
  mine: boolean;
  canRead: boolean;
  answered: boolean;
  status: string;
  createdAt: string;
  previewText: string;
};

export type InquiryDetail = InquirySummary & {
  content: string;
  adminReply: string | null;
  adminReplyAt: string | null;
  adminReplyAdminName: string | null;
};

function normalizeInquirySummary(value: unknown): InquirySummary | null {
  const inquiry = (value ?? {}) as Partial<InquirySummary>;

  if (
    typeof inquiry.id !== "number" ||
    typeof inquiry.title !== "string" ||
    typeof inquiry.authorName !== "string" ||
    typeof inquiry.secret !== "boolean" ||
    typeof inquiry.mine !== "boolean" ||
    typeof inquiry.canRead !== "boolean" ||
    typeof inquiry.answered !== "boolean" ||
    typeof inquiry.status !== "string" ||
    typeof inquiry.createdAt !== "string" ||
    typeof inquiry.previewText !== "string"
  ) {
    return null;
  }

  return {
    id: inquiry.id,
    title: inquiry.title,
    authorName: inquiry.authorName,
    secret: inquiry.secret,
    mine: inquiry.mine,
    canRead: inquiry.canRead,
    answered: inquiry.answered,
    status: inquiry.status,
    createdAt: inquiry.createdAt,
    previewText: inquiry.previewText,
  };
}

function normalizeInquiryDetail(value: unknown): InquiryDetail {
  const inquiry = (value ?? {}) as Partial<InquiryDetail>;
  const summary = normalizeInquirySummary(inquiry);

  if (!summary || typeof inquiry.content !== "string") {
    throw new Error("문의 상세 응답 형식이 올바르지 않습니다.");
  }

  return {
    ...summary,
    content: inquiry.content,
    adminReply: typeof inquiry.adminReply === "string" ? inquiry.adminReply : null,
    adminReplyAt: typeof inquiry.adminReplyAt === "string" ? inquiry.adminReplyAt : null,
    adminReplyAdminName: typeof inquiry.adminReplyAdminName === "string" ? inquiry.adminReplyAdminName : null,
  };
}

export async function listInquiries() {
  const response = await apiRequest<unknown>("/api/inquiries");
  if (!Array.isArray(response)) {
    return [];
  }

  return response
    .map((item) => normalizeInquirySummary(item))
    .filter((item): item is InquirySummary => Boolean(item));
}

export async function getInquiryDetail(inquiryId: number) {
  const response = await apiRequest<unknown>(`/api/inquiries/${inquiryId}`);
  return normalizeInquiryDetail(response);
}

export async function createInquiry(payload: { title: string; content: string; secret: boolean }) {
  return apiRequest<{ id: number }>("/api/inquiries", {
    method: "POST",
    json: {
      title: payload.title.trim(),
      content: payload.content.trim(),
      secret: payload.secret,
    },
  });
}

export async function updateInquiry(inquiryId: number, payload: { title: string; content: string; secret: boolean }) {
  return apiRequest<{ ok: boolean }>(`/api/inquiries/${inquiryId}`, {
    method: "PATCH",
    json: {
      title: payload.title.trim(),
      content: payload.content.trim(),
      secret: payload.secret,
    },
  });
}

export async function replyInquiry(inquiryId: number, reply: string) {
  return apiRequest<{ ok: boolean }>(`/api/admin/inquiries/${inquiryId}/reply`, {
    method: "PATCH",
    json: {
      reply: reply.trim(),
    },
  });
}
