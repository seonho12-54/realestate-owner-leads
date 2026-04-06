"use client";

import { useState } from "react";

export function LogoutButton({
  action,
  redirectTo = "/",
  className = "button button-ghost button-small",
  label = "로그아웃",
}: {
  action: "/api/auth/logout" | "/api/admin/logout";
  redirectTo?: string;
  className?: string;
  label?: string;
}) {
  const [isPending, setIsPending] = useState(false);

  async function handleLogout() {
    try {
      setIsPending(true);

      const response = await fetch(action, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("로그아웃 처리에 실패했습니다.");
      }
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
