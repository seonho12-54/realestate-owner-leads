import { Navigate } from "react-router-dom";

import { AdminLoginForm } from "@/components/AdminLoginForm";
import { useSession } from "@/context/SessionContext";

export function AdminLoginPage() {
  const { session } = useSession();

  if (!session.isLoading && session.kind === "admin") {
    return <Navigate to="/admin/leads" replace />;
  }

  return (
    <div className="auth-page">
      <AdminLoginForm />
    </div>
  );
}
