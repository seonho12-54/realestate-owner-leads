const ACCESS_TOKEN_KEY = "downy_access_token";

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function readAccessToken() {
  return getStorage()?.getItem(ACCESS_TOKEN_KEY) ?? null;
}

export function writeAccessToken(accessToken: string) {
  getStorage()?.setItem(ACCESS_TOKEN_KEY, accessToken);
}

export function clearAccessToken() {
  getStorage()?.removeItem(ACCESS_TOKEN_KEY);
}
