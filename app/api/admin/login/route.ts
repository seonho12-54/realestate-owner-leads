import { NextResponse } from "next/server";

import { writeAuditLog } from "@/lib/audit";
import { clearUserSessionCookie, createAdminSessionToken, setAdminSessionCookie, verifyPassword } from "@/lib/auth";
import { findAdminByEmail, touchAdminLastLogin } from "@/lib/admins";
import { getRequestMeta } from "@/lib/request";
import { adminLoginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const payload = adminLoginSchema.parse(await request.json());
    const admin = await findAdminByEmail(payload.email);

    if (!admin || !admin.isActive || !verifyPassword(payload.password, admin.passwordHash)) {
      return NextResponse.json(
        {
          error: "이메일 또는 비밀번호가 올바르지 않습니다.",
        },
        { status: 401 },
      );
    }

    await touchAdminLastLogin(admin.id);

    const requestMeta = getRequestMeta(request);

    await writeAuditLog({
      adminId: admin.id,
      actionType: "admin.login",
      entityType: "admin",
      entityId: admin.id,
      requestIp: requestMeta.ip,
      userAgent: requestMeta.userAgent,
      payload: {
        email: admin.email,
      },
    });

    clearUserSessionCookie();

    const sessionToken = createAdminSessionToken({
      adminId: admin.id,
      officeId: admin.officeId,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    });

    setAdminSessionCookie(sessionToken);

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "로그인 처리에 실패했습니다.",
      },
      { status: 400 },
    );
  }
}
