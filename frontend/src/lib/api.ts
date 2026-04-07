type JsonBody = Record<string, unknown> | Array<unknown> | null;

function buildUrl(path: string) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";
  return `${baseUrl}${path}`;
}

export async function apiRequest<T>(path: string, init?: RequestInit & { json?: JsonBody }): Promise<T> {
  const headers = new Headers(init?.headers);

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
