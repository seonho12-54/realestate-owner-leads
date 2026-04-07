import { apiRequest } from "@/lib/api";

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

export async function fetchSession() {
  return apiRequest<CurrentSessionResponse>("/api/session");
}

export async function signupUser(payload: UserSignupPayload) {
  return apiRequest<{ ok: boolean; userId: number }>("/api/auth/signup", {
    method: "POST",
    json: payload,
  });
}

export async function loginUser(payload: UserLoginPayload) {
  return apiRequest<{ ok: boolean }>("/api/auth/login", {
    method: "POST",
    json: payload,
  });
}

export async function loginAdmin(payload: AdminLoginPayload) {
  return apiRequest<{ ok: boolean }>("/api/admin/login", {
    method: "POST",
    json: payload,
  });
}

export async function logoutUser() {
  return apiRequest<{ ok: boolean }>("/api/auth/logout", {
    method: "POST",
  });
}

export async function logoutAdmin() {
  return apiRequest<{ ok: boolean }>("/api/admin/logout", {
    method: "POST",
  });
}
