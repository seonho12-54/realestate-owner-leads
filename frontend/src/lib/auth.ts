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

export type CurrentSessionResponse = {
  authenticated: boolean;
  kind: SessionKind;
  user: CurrentUser | null;
  kakaoJsKey: string | null;
};

export type UserSignupPayload = {
  name: string;
  email: string;
  phone: string;
  password: string;
};

export type UserLoginPayload = {
  email: string;
  password: string;
};

export type AdminLoginPayload = {
  email: string;
  password: string;
};

type AuthSuccessResponse = {
  ok: boolean;
  kind: Exclude<SessionKind, null>;
  accessToken: string;
  userId?: number;
};

function storeAccessToken(response: AuthSuccessResponse) {
  if (!response.accessToken) {
    throw new Error("로그인 토큰을 받지 못했습니다.");
  }

  writeAccessToken(response.accessToken);
  return response;
}

export async function fetchSession() {
  return apiRequest<CurrentSessionResponse>("/api/session");
}

export async function signupUser(payload: UserSignupPayload) {
  const response = await apiRequest<AuthSuccessResponse>("/api/auth/signup", {
    method: "POST",
    json: payload,
  });
  return storeAccessToken(response);
}

export async function loginUser(payload: UserLoginPayload) {
  const response = await apiRequest<AuthSuccessResponse>("/api/auth/login", {
    method: "POST",
    json: payload,
  });
  return storeAccessToken(response);
}

export async function loginAdmin(payload: AdminLoginPayload) {
  const response = await apiRequest<AuthSuccessResponse>("/api/admin/login", {
    method: "POST",
    json: payload,
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
