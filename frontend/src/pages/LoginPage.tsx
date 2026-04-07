import { Navigate, useSearchParams } from "react-router-dom";

import { UserLoginForm } from "@/components/UserLoginForm";
import { useSession } from "@/context/SessionContext";

export function LoginPage() {
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
      <UserLoginForm nextUrl={nextUrl} />
    </div>
  );
}
