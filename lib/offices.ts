import type { DbRow } from "@/lib/db";
import { getPool } from "@/lib/db";
import { ensureRuntimeSchema } from "@/lib/schema";

export type OfficeOption = {
  id: number;
  name: string;
  slug: string;
  phone: string | null;
  address: string | null;
  description: string | null;
};

type OfficeRow = DbRow & OfficeOption;

export async function listActiveOffices(): Promise<OfficeOption[]> {
  await ensureRuntimeSchema();

  const [rows] = await getPool().query<OfficeRow[]>(
    `
      SELECT id, name, slug, phone, address, description
      FROM offices
      WHERE is_active = 1
      ORDER BY id ASC
    `,
  );

  return rows.map((row) => ({
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    phone: row.phone,
    address: row.address,
    description: row.description,
  }));
}
