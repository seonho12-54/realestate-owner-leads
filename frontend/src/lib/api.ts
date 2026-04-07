import { readAccessToken } from "@/lib/token";

type JsonBody = Record<string, unknown> | Array<unknown> | null;

function buildUrl(path: string) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";
  return `${baseUrl}${path}`;
}

export function createApiHeaders(initHeaders?: HeadersInit) {
  const headers = new Headers(initHeaders);
  const accessToken = readAccessToken();

  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return headers;
}

export async function apiFetch(path: string, init?: RequestInit & { json?: JsonBody }) {
  const headers = createApiHeaders(init?.headers);

  let body = init?.body;
  if (init?.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }

  return fetch(buildUrl(path), {
    credentials: "include",
    ...init,
    headers,
    body,
  });
}

export async function apiRequest<T>(path: string, init?: RequestInit & { json?: JsonBody }): Promise<T> {
  const response = await apiFetch(path, init);

  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : "요청을 처리하지 못했습니다.";
    throw new Error(message);
  }

  return data as T;
}
