import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth";
import { updateLeadAdminFields } from "@/lib/leads";
import { getRequestMeta } from "@/lib/request";
import { adminLeadUpdateSchema } from "@/lib/validation";

export async function PATCH(request: Request, context: { params: { leadId: string } }) {
  const session = getAdminSession();

  if (!session) {
    return NextResponse.json(
      {
        error: "로그인이 필요합니다.",
      },
      { status: 401 },
    );
  }

  try {
    const leadId = Number(context.params.leadId);
    if (!Number.isFinite(leadId) || leadId <= 0) {
      throw new Error("잘못된 매물 번호입니다.");
    }

    const input = adminLeadUpdateSchema.parse(await request.json());

    await updateLeadAdminFields({
      leadId,
      input,
      adminId: session.adminId,
      requestMeta: getRequestMeta(request),
    });

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "관리자 저장에 실패했습니다.",
      },
      { status: 400 },
    );
  }
}

