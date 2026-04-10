import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { fetchSession, type CurrentSessionResponse } from "@/lib/auth";
import { clearAccessToken } from "@/lib/token";

type SessionState = CurrentSessionResponse & {
  isLoading: boolean;
};

type SessionContextValue = {
  session: SessionState;
  refreshSession: () => Promise<void>;
};

const defaultSession: SessionState = {
  authenticated: false,
  kind: null,
  user: null,
  kakaoJsKey: null,
  region: {
    locked: false,
    region: null,
    verifiedAt: 0,
    source: "none",
  },
  isLoading: true,
};

const SessionContext = createContext<SessionContextValue | null>(null);

function applyKakaoKey(kakaoJsKey: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  window.__DOWNY_KAKAO_JS_KEY__ = kakaoJsKey ?? undefined;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>(defaultSession);

  const refreshSession = useCallback(async () => {
    try {
      const nextSession = await fetchSession();
      if (!nextSession.authenticated) {
        clearAccessToken();
      }
      applyKakaoKey(nextSession.kakaoJsKey);
      setSession({
        ...nextSession,
        isLoading: false,
      });
    } catch {
      clearAccessToken();
      applyKakaoKey(null);
      setSession({
        ...defaultSession,
        isLoading: false,
      });
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const value = useMemo(
    () => ({
      session,
      refreshSession,
    }),
    [refreshSession, session],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }

  return context;
}
