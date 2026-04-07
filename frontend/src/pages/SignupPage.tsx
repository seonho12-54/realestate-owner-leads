import { Navigate, useSearchParams } from "react-router-dom";

import { UserSignupForm } from "@/components/UserSignupForm";
import { useSession } from "@/context/SessionContext";

export function SignupPage() {
  const { session } = useSession();
  const [searchParams] = useSearchParams();
  const nextUrl = searchParams.get("next") || "/";

  if (!session.isLoading && session.kind === "admin") {
    return <Navigate to="/admin/leads" replace />;
  }

  if (!session.isLoading && session.kind === "user") {
    return <Navigate to={nextUrl} replace />;
  }

  return (
    <div className="auth-page">
      <UserSignupForm nextUrl={nextUrl} />
    </div>
  );
}
