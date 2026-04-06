import { NextResponse } from "next/server";

import { getAdminSession, getUserSession } from "@/lib/auth";
import { createLead } from "@/lib/leads";
import { getRequestMeta } from "@/lib/request";
import { leadCreateSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const adminSession = getAdminSession();
  const userSession = getUserSession();

  if (!adminSession && !userSession) {
    return NextResponse.json(
      {
        error: "로그인이 필요합니다.",
      },
      { status: 401 },
    );
  }

  try {
    const payload = leadCreateSchema.parse(await request.json());
    const leadId = await createLead(payload, getRequestMeta(request), {
      userId: userSession?.userId ?? null,
      adminId: adminSession?.adminId ?? null,
      bypassLocationCheck: Boolean(adminSession),
    });

    return NextResponse.json({
      id: leadId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "매물 접수에 실패했습니다.",
      },
      { status: 400 },
    );
  }
}
