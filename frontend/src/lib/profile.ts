import { apiRequest } from "@/lib/api";

export type MyProfile = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  phoneVerifiedAt: number;
  verifiedRegionName: string | null;
};

export type UpdateMyProfilePayload = {
  name: string;
  email: string;
  currentPassword: string;
  newPassword?: string;
};

function normalizeProfile(value: unknown): MyProfile {
  const profile = (value ?? {}) as Partial<MyProfile>;

  if (typeof profile.id !== "number" || typeof profile.name !== "string" || typeof profile.email !== "string") {
    throw new Error("개인정보 응답 형식이 올바르지 않습니다.");
  }

  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    phone: typeof profile.phone === "string" ? profile.phone : null,
    phoneVerifiedAt: typeof profile.phoneVerifiedAt === "number" ? profile.phoneVerifiedAt : 0,
    verifiedRegionName: typeof profile.verifiedRegionName === "string" ? profile.verifiedRegionName : null,
  };
}

export async function getMyProfile() {
  const response = await apiRequest<unknown>("/api/me/profile");
  return normalizeProfile(response);
}

export async function verifyMyPassword(password: string) {
  return apiRequest<{ ok: boolean }>("/api/me/profile/verify-password", {
    method: "POST",
    json: {
      password,
    },
  });
}

export async function updateMyProfile(payload: UpdateMyProfilePayload) {
  const response = await apiRequest<unknown>("/api/me/profile", {
    method: "PATCH",
    json: {
      name: payload.name.trim(),
      email: payload.email.trim().toLowerCase(),
      currentPassword: payload.currentPassword,
      newPassword: payload.newPassword?.trim() ? payload.newPassword.trim() : "",
    },
  });

  return normalizeProfile(response);
}
