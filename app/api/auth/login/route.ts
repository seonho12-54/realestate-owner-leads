import { NextResponse } from "next/server";

import { writeAuditLog } from "@/lib/audit";
import { createUserSessionToken, setUserSessionCookie, verifyPassword } from "@/lib/auth";
import { getRequestMeta } from "@/lib/request";
import { findUserByEmail, touchUserLastLogin } from "@/lib/users";
import { userLoginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const payload = userLoginSchema.parse(await request.json());
    const user = await findUserByEmail(payload.email);

    if (!user || !user.isActive || !verifyPassword(payload.password, user.passwordHash)) {
      return NextResponse.json(
        {
          error: "이메일 또는 비밀번호가 올바르지 않습니다.",
        },
        { status: 401 },
      );
    }

    await touchUserLastLogin(user.id);

    const requestMeta = getRequestMeta(request);

    await writeAuditLog({
      actionType: "user.login",
      entityType: "user",
      entityId: user.id,
      requestIp: requestMeta.ip,
      userAgent: requestMeta.userAgent,
      payload: {
        email: user.email,
      },
    });

    setUserSessionCookie(
      createUserSessionToken({
        userId: user.id,
        email: user.email,
        name: user.name,
      }),
    );

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "로그인에 실패했습니다.",
      },
      { status: 400 },
    );
  }
}

