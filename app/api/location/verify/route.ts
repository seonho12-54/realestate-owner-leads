import { NextResponse } from "next/server";

import { verifyCoordsWithinServiceArea } from "@/lib/kakao";
import { locationVerifySchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const payload = locationVerifySchema.parse(await request.json());
    const result = await verifyCoordsWithinServiceArea(payload.latitude, payload.longitude);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "위치 확인에 실패했습니다.",
      },
      { status: 400 },
    );
  }
}

