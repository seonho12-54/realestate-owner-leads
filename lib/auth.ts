import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import { getEnv } from "@/lib/env";

const ADMIN_SESSION_COOKIE_NAME = "rea_admin_session";
const USER_SESSION_COOKIE_NAME = "rea_user_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 14;

export type AdminSession = {
  adminId: number;
  officeId: number | null;
  email: string;
  name: string;
  role: string;
  exp: number;
};

export type UserSession = {
  userId: number;
  email: string;
  name: string;
  exp: number;
};

type SessionPayload = Record<string, unknown> & { exp: number };

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

function getSigningKey(kind: "admin" | "user"): string {
  const env = getEnv();
  if (kind === "user") {
    return env.USER_SESSION_SECRET ?? env.ADMIN_SESSION_SECRET;
  }

  return env.ADMIN_SESSION_SECRET;
}

function signValue(kind: "admin" | "user", encodedPayload: string): string {
  return createHmac("sha256", getSigningKey(kind)).update(encodedPayload).digest("base64url");
}

function createSessionToken(kind: "admin" | "user", payload: Omit<AdminSession, "exp"> | Omit<UserSession, "exp">): string {
  const sessionPayload: SessionPayload = {
    ...payload,
    exp: Date.now() + SESSION_DURATION_MS,
  };

  const encodedPayload = Buffer.from(JSON.stringify(sessionPayload), "utf8").toString("base64url");
  const signature = signValue(kind, encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function verifySessionToken<T extends SessionPayload>(kind: "admin" | "user", token: string | undefined): T | null {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signValue(kind, encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as T;

    if (payload.exp <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function setSessionCookie(name: string, value: string): void {
  cookies().set({
    name,
    value,
    httpOnly: true,
    sameSite: "lax",
    secure: getEnv().NODE_ENV === "production",
    path: "/",
    expires: new Date(Date.now() + SESSION_DURATION_MS),
  });
}

function clearSessionCookie(name: string): void {
  cookies().set({
    name,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: getEnv().NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

export function createAdminSessionToken(payload: Omit<AdminSession, "exp">): string {
  return createSessionToken("admin", payload);
}

export function createUserSessionToken(payload: Omit<UserSession, "exp">): string {
  return createSessionToken("user", payload);
}

export function setAdminSessionCookie(sessionToken: string): void {
  setSessionCookie(ADMIN_SESSION_COOKIE_NAME, sessionToken);
}

export function setUserSessionCookie(sessionToken: string): void {
  setSessionCookie(USER_SESSION_COOKIE_NAME, sessionToken);
}

export function clearAdminSessionCookie(): void {
  clearSessionCookie(ADMIN_SESSION_COOKIE_NAME);
}

export function clearUserSessionCookie(): void {
  clearSessionCookie(USER_SESSION_COOKIE_NAME);
}

export function getAdminSession(): AdminSession | null {
  return verifySessionToken<AdminSession>("admin", cookies().get(ADMIN_SESSION_COOKIE_NAME)?.value);
}

export function getUserSession(): UserSession | null {
  return verifySessionToken<UserSession>("user", cookies().get(USER_SESSION_COOKIE_NAME)?.value);
}

export function requireAdminSession(): AdminSession {
  const session = getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  return session;
}

export function requireUserSession(): UserSession {
  const session = getUserSession();
  if (!session) {
    redirect("/login");
  }

  return session;
}

