import { apiRequest } from "@/lib/api";
import { clearAccessToken, writeAccessToken } from "@/lib/token";

export type SessionKind = "admin" | "user" | null;

export type CurrentUser = {
  id: number;
  email: string;
  name: string;
  role: string | null;
  officeId: number | null;
};

export type VerifiedRegion = {
  slug: string;
  name: string;
  city: string;
  district: string;
  neighborhood: string;
  centerLat: number;
  centerLng: number;
};

export type RegionStatus = {
  locked: boolean;
  region: VerifiedRegion | null;
  verifiedAt: number;
  source: "user" | "guest" | "none";
};

export type CurrentSessionResponse = {
  authenticated: boolean;
  kind: SessionKind;
  user: CurrentUser | null;
  kakaoJsKey: string | null;
  region: RegionStatus;
};

export type UserSignupPayload = {
  name: string;
  email: string;
  phone: string;
  password: string;
  phoneVerificationKey: string;
};

export type UserLoginPayload = {
  email: string;
  password: string;
};

export type AdminLoginPayload = {
  email: string;
  password: string;
};

export type SignupPhoneVerificationRequest = {
  ok: boolean;
  verificationKey: string;
  expiresInSeconds: number;
};

type AuthSuccessResponse = {
  ok: boolean;
  kind?: Exclude<SessionKind, null>;
  accessToken?: string | null;
  userId?: number;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string) {
  return value.trim();
}

function normalizeName(value: string) {
  return value.trim();
}

function storeAccessToken(response: AuthSuccessResponse) {
  if (typeof response.accessToken === "string" && response.accessToken.length > 0) {
    writeAccessToken(response.accessToken);
    return response;
  }

  clearAccessToken();
  return response;
}

export async function fetchSession() {
  return apiRequest<CurrentSessionResponse>("/api/session");
}

export async function requestSignupPhoneVerification(phone: string) {
  return apiRequest<SignupPhoneVerificationRequest>("/api/auth/phone-verification/request", {
    method: "POST",
    json: {
      phone: normalizePhone(phone),
    },
  });
}

export async function confirmSignupPhoneVerification(phone: string, verificationKey: string, code: string) {
  return apiRequest<{ ok: boolean }>("/api/auth/phone-verification/confirm", {
    method: "POST",
    json: {
      phone: normalizePhone(phone),
      verificationKey,
      code: code.trim(),
    },
  });
}

export async function signupUser(payload: UserSignupPayload) {
  const response = await apiRequest<AuthSuccessResponse>("/api/auth/signup", {
    method: "POST",
    json: {
      ...payload,
      name: normalizeName(payload.name),
      email: normalizeEmail(payload.email),
      phone: normalizePhone(payload.phone),
      phoneVerificationKey: payload.phoneVerificationKey,
    },
  });
  return storeAccessToken(response);
}

export async function loginUser(payload: UserLoginPayload) {
  const response = await apiRequest<AuthSuccessResponse>("/api/auth/login", {
    method: "POST",
    json: {
      ...payload,
      email: normalizeEmail(payload.email),
    },
  });
  return storeAccessToken(response);
}

export async function loginAdmin(payload: AdminLoginPayload) {
  const response = await apiRequest<AuthSuccessResponse>("/api/admin/login", {
    method: "POST",
    json: {
      ...payload,
      email: normalizeEmail(payload.email),
    },
  });
  return storeAccessToken(response);
}

export async function logoutUser() {
  try {
    return await apiRequest<{ ok: boolean }>("/api/auth/logout", {
      method: "POST",
    });
  } finally {
    clearAccessToken();
  }
}

export async function logoutAdmin() {
  try {
    return await apiRequest<{ ok: boolean }>("/api/admin/logout", {
      method: "POST",
    });
  } finally {
    clearAccessToken();
  }
}
