import { readAccessToken } from "@/lib/token";

type JsonBody = Record<string, unknown> | Array<unknown> | null;

function getConfiguredApiBase() {
  return import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";
}

function canUseDirectApiFallback() {
  if (typeof window === "undefined") {
    return false;
  }

  return ["3000", "4173", "5173"].includes(window.location.port);
}

function buildUrl(path: string, options?: { directApi?: boolean }) {
  const configuredBase = getConfiguredApiBase();

  if (options?.directApi && typeof window !== "undefined") {
    return `http://${window.location.hostname}:8080${path}`;
  }

  if (configuredBase) {
    return `${configuredBase}${path}`;
  }

  return path;
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

  const response = await fetch(buildUrl(path), {
    credentials: "include",
    ...init,
    headers,
    body,
  });

  const contentType = response.headers.get("content-type") ?? "";
  if (response.ok && path.startsWith("/api/") && contentType.includes("text/html") && canUseDirectApiFallback()) {
    return fetch(buildUrl(path, { directApi: true }), {
      credentials: "include",
      ...init,
      headers,
      body,
    });
  }

  return response;
}

export async function apiRequest<T>(path: string, init?: RequestInit & { json?: JsonBody }): Promise<T> {
  const response = await apiFetch(path, init);

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : "요청을 처리하지 못했습니다.";
    throw new Error(message);
  }

  if (!isJson && path.startsWith("/api/")) {
    throw new Error("API 응답이 JSON이 아니어서 로그인 상태를 읽지 못했습니다. 프론트 서버만 열려 있거나 /api 프록시가 빠졌는지 확인해 주세요.");
  }

  return data as T;
}
