import { redirect } from "next/navigation";

import { UserSignupForm } from "@/components/UserSignupForm";
import { getUserSession } from "@/lib/auth";

export default function SignupPage({
  searchParams,
}: {
  searchParams?: {
    next?: string;
  };
}) {
  if (getUserSession()) {
    redirect(searchParams?.next || "/");
  }

  return (
    <div className="auth-page">
      <UserSignupForm nextUrl={searchParams?.next || "/"} />
    </div>
  );
}

