import { NextResponse } from "next/server";

import { clearUserSessionCookie } from "@/lib/auth";

export async function POST() {
  clearUserSessionCookie();
  return new NextResponse(null, {
    status: 303,
    headers: {
      Location: "/",
    },
  });
}
