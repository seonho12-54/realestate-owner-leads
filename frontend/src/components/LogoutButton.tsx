import { useState } from "react";

import { useSession } from "@/context/SessionContext";
import { logoutAdmin, logoutUser } from "@/lib/auth";

export function LogoutButton({
  action,
  redirectTo = "/",
  className = "nav-button nav-button-secondary",
  label = "로그아웃",
}: {
  action: "/api/auth/logout" | "/api/admin/logout";
  redirectTo?: string;
  className?: string;
  label?: string;
}) {
  const [isPending, setIsPending] = useState(false);
  const { refreshSession } = useSession();

  async function handleLogout() {
    try {
      setIsPending(true);

      if (action === "/api/admin/logout") {
        await logoutAdmin();
      } else {
        await logoutUser();
      }

      await refreshSession();
    } catch (error) {
      console.error("Failed to logout", error);
    } finally {
      window.location.assign(redirectTo);
    }
  }

  return (
    <button className={className} type="button" onClick={handleLogout} disabled={isPending}>
      {isPending ? "로그아웃 중..." : label}
    </button>
  );
}
