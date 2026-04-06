import type { DbMutation, DbRow } from "@/lib/db";
import { getPool } from "@/lib/db";
import { ensureRuntimeSchema } from "@/lib/schema";

export type AdminRecord = {
  id: number;
  officeId: number | null;
  email: string;
  name: string;
  role: string;
  passwordHash: string;
  isActive: boolean;
};

type AdminRow = DbRow & {
  id: number;
  office_id: number | null;
  email: string;
  name: string;
  role: string;
  password_hash: string;
  is_active: number;
};

export async function findAdminByEmail(email: string): Promise<AdminRecord | null> {
  await ensureRuntimeSchema();

  const [rows] = await getPool().execute<AdminRow[]>(
    `
      SELECT id, office_id, email, name, role, password_hash, is_active
      FROM admins
      WHERE email = ?
      LIMIT 1
    `,
    [email],
  );

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    officeId: row.office_id === null ? null : Number(row.office_id),
    email: row.email,
    name: row.name,
    role: row.role,
    passwordHash: row.password_hash,
    isActive: Boolean(row.is_active),
  };
}

export async function touchAdminLastLogin(adminId: number): Promise<void> {
  await ensureRuntimeSchema();

  await getPool().execute<DbMutation>(
    `
      UPDATE admins
      SET last_login_at = NOW()
      WHERE id = ?
    `,
    [adminId],
  );
}
