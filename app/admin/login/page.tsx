import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/AdminLoginForm";
import { getAdminSession } from "@/lib/auth";

export default function AdminLoginPage() {
  if (getAdminSession()) {
    redirect("/admin/leads");
  }

  return (
    <div className="auth-page">
      <AdminLoginForm />
    </div>
  );
}
