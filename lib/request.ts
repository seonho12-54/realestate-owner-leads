export type RequestMeta = {
  ip: string | null;
  userAgent: string | null;
};

export function getRequestMeta(request: Request): RequestMeta {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? null;
  const userAgent = request.headers.get("user-agent");

  return {
    ip,
    userAgent,
  };
}

