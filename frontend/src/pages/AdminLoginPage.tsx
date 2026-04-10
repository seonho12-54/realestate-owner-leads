import { Navigate } from "react-router-dom";

import { UserLoginForm } from "@/components/UserLoginForm";
import { useSession } from "@/context/SessionContext";

export function AdminLoginPage() {
  const { session } = useSession();

  if (!session.isLoading && session.kind === "admin") {
    return <Navigate to="/admin/leads" replace />;
  }

  if (!session.isLoading && session.kind === "user") {
    return <Navigate to="/manage" replace />;
  }

  return (
    <div className="auth-page">
      <UserLoginForm nextUrl="/admin/leads" />
    </div>
  );
}
