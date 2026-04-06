import { redirect } from "next/navigation";

import { UserSignupForm } from "@/components/UserSignupForm";
import { getAdminSession, getUserSession } from "@/lib/auth";

export default function SignupPage({
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
      <UserSignupForm nextUrl={searchParams?.next || "/"} />
    </div>
  );
}
