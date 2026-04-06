import type { DbMutation, DbRow } from "@/lib/db";
import { getPool } from "@/lib/db";

export type UserRecord = {
  id: number;
  email: string;
  passwordHash: string;
  name: string;
  phone: string | null;
  isActive: boolean;
};

type UserRow = DbRow & {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  phone: string | null;
  is_active: number;
};

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const [rows] = await getPool().execute<UserRow[]>(
    `
      SELECT id, email, password_hash, name, phone, is_active
      FROM users
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
    email: row.email,
    passwordHash: row.password_hash,
    name: row.name,
    phone: row.phone,
    isActive: Boolean(row.is_active),
  };
}

export async function createUser(params: {
  email: string;
  passwordHash: string;
  name: string;
  phone?: string | null;
}): Promise<number> {
  const [result] = await getPool().execute<DbMutation>(
    `
      INSERT INTO users (
        email,
        password_hash,
        name,
        phone
      ) VALUES (?, ?, ?, ?)
    `,
    [params.email, params.passwordHash, params.name, params.phone ?? null],
  );

  return Number(result.insertId);
}

export async function touchUserLastLogin(userId: number): Promise<void> {
  await getPool().execute(
    `
      UPDATE users
      SET last_login_at = NOW()
      WHERE id = ?
    `,
    [userId],
  );
}

