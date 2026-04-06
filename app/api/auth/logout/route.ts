import { NextResponse } from "next/server";

import { clearUserSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  clearUserSessionCookie();
  return NextResponse.redirect(new URL("/", request.url));
}

