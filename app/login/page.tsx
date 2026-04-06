import { redirect } from "next/navigation";

import { UserLoginForm } from "@/components/UserLoginForm";
import { getAdminSession, getUserSession } from "@/lib/auth";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: {
    next?: string;
  };
}) {
  if (getAdminSession()) {
    redirect("/admin/leads");
  }

  if (getUserSession()) {
    redirect(searchParams?.next || "/");
  }

  return (
    <div className="auth-page">
      <UserLoginForm nextUrl={searchParams?.next || "/"} />
    </div>
  );
}
