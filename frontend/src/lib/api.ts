import { readAccessToken } from "@/lib/token";

type JsonBody = Record<string, unknown> | Array<unknown> | null;

type ApiErrorResponse = {
  error?: string;
  code?: string;
};

export class ApiError extends Error {
  code: string | null;
  status: number;

  constructor(message: string, options?: { code?: string | null; status?: number }) {
    super(message);
    this.name = "ApiError";
    this.code = options?.code ?? null;
    this.status = options?.status ?? 500;
  }
}

function getConfiguredApiBase() {
  return import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";
}

function canUseDirectApiFallback() {
  if (typeof window === "undefined") {
    return false;
  }

  return ["3000", "3001", "4173", "5173"].includes(window.location.port);
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

  const requestInit: RequestInit = {
    credentials: "include",
    ...init,
    headers,
    body,
  };

  const response = await fetch(buildUrl(path), requestInit);
  const contentType = response.headers.get("content-type") ?? "";

  if (response.ok && path.startsWith("/api/") && contentType.includes("text/html") && canUseDirectApiFallback()) {
    return fetch(buildUrl(path, { directApi: true }), requestInit);
  }

  return response;
}

export async function apiRequest<T>(path: string, init?: RequestInit & { json?: JsonBody }): Promise<T> {
  const response = await apiFetch(path, init);
  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const data = (isJson ? await response.json() : null) as ApiErrorResponse | null;

  if (!response.ok) {
    const message = data?.error && typeof data.error === "string" ? data.error : "요청을 처리하지 못했어요.";
    const code = data?.code && typeof data.code === "string" ? data.code : null;
    throw new ApiError(message, {
      code,
      status: response.status,
    });
  }

  if (!isJson && path.startsWith("/api/")) {
    throw new ApiError("API 응답이 JSON이 아니에요. 프론트 개발 서버와 /api 프록시 설정을 확인해주세요.", {
      status: response.status,
    });
  }

  return data as T;
}
