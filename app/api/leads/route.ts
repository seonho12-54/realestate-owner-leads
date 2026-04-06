import { NextResponse } from "next/server";

import { createLead } from "@/lib/leads";
import { getRequestMeta } from "@/lib/request";
import { leadCreateSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const payload = leadCreateSchema.parse(await request.json());
    const leadId = await createLead(payload, getRequestMeta(request));

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

