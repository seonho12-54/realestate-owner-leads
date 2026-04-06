import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import { getEnv } from "@/lib/env";

const SESSION_COOKIE_NAME = "rea_admin_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 12;

export type AdminSession = {
  adminId: number;
  officeId: number | null;
  email: string;
  name: string;
  role: string;
  exp: number;
};

type SessionPayload = Omit<AdminSession, "exp">;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(password: string, hash: string): boolean {
  const [algorithm, salt, storedHash] = hash.split(":");
  if (algorithm !== "scrypt" || !salt || !storedHash) {
    return false;
  }

  const derived = scryptSync(password, salt, 64).toString("hex");
  const derivedBuffer = Buffer.from(derived, "hex");
  const storedBuffer = Buffer.from(storedHash, "hex");

  if (derivedBuffer.length !== storedBuffer.length) {
    return false;
  }

  return timingSafeEqual(derivedBuffer, storedBuffer);
}

function signValue(encodedPayload: string): string {
  return createHmac("sha256", getEnv().ADMIN_SESSION_SECRET).update(encodedPayload).digest("base64url");
}

export function createAdminSessionToken(payload: SessionPayload): string {
  const session: AdminSession = {
    ...payload,
    exp: Date.now() + SESSION_DURATION_MS,
  };

  const encodedPayload = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  const signature = signValue(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyAdminSessionToken(token: string | undefined): AdminSession | null {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signValue(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as AdminSession;
    if (payload.exp <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function setAdminSessionCookie(sessionToken: string): void {
  cookies().set({
    name: SESSION_COOKIE_NAME,
    value: sessionToken,
    httpOnly: true,
    sameSite: "lax",
    secure: getEnv().NODE_ENV === "production",
    path: "/",
    expires: new Date(Date.now() + SESSION_DURATION_MS),
  });
}

export function clearAdminSessionCookie(): void {
  cookies().set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: getEnv().NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

export function getAdminSession(): AdminSession | null {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  return verifyAdminSessionToken(token);
}

export function requireAdminSession(): AdminSession {
  const session = getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  return session;
}
