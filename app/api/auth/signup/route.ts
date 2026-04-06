import { NextResponse } from "next/server";

import { writeAuditLog } from "@/lib/audit";
import { createUserSessionToken, hashPassword, setUserSessionCookie } from "@/lib/auth";
import { getRequestMeta } from "@/lib/request";
import { createUser, findUserByEmail } from "@/lib/users";
import { userSignupSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const payload = userSignupSchema.parse(await request.json());
    const existingUser = await findUserByEmail(payload.email);

    if (existingUser) {
      return NextResponse.json(
        {
          error: "이미 가입된 이메일입니다.",
        },
        { status: 409 },
      );
    }

    const userId = await createUser({
      email: payload.email,
      passwordHash: hashPassword(payload.password),
      name: payload.name,
      phone: payload.phone || null,
    });

    const requestMeta = getRequestMeta(request);

    await writeAuditLog({
      actionType: "user.signup",
      entityType: "user",
      entityId: userId,
      requestIp: requestMeta.ip,
      userAgent: requestMeta.userAgent,
      payload: {
        email: payload.email,
      },
    });

    setUserSessionCookie(
      createUserSessionToken({
        userId,
        email: payload.email,
        name: payload.name,
      }),
    );

    return NextResponse.json({
      ok: true,
      userId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "회원가입에 실패했습니다.",
      },
      { status: 400 },
    );
  }
}
