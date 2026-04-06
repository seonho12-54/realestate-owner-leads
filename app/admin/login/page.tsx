import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/AdminLoginForm";
import { getAdminSession } from "@/lib/auth";

export default function AdminLoginPage() {
  const session = getAdminSession();

  if (session) {
    redirect("/admin/leads");
  }

  return (
    <div className="login-wrap">
      <AdminLoginForm />
    </div>
  );
}

