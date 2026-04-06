import type { PoolConnection } from "mysql2/promise";

import { getPool } from "@/lib/db";
import { ensureRuntimeSchema } from "@/lib/schema";

type AuditLogInput = {
  adminId?: number | null;
  actionType: string;
  entityType: string;
  entityId?: number | null;
  requestIp?: string | null;
  userAgent?: string | null;
  payload?: Record<string, unknown> | null;
};

export async function writeAuditLog(input: AuditLogInput, connection?: PoolConnection): Promise<void> {
  await ensureRuntimeSchema();

  const executor = connection ?? getPool();

  await executor.execute(
    `
      INSERT INTO audit_logs (
        admin_id,
        action_type,
        entity_type,
        entity_id,
        request_ip,
        user_agent,
        payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.adminId ?? null,
      input.actionType,
      input.entityType,
      input.entityId ?? null,
      input.requestIp ?? null,
      input.userAgent ?? null,
      input.payload ? JSON.stringify(input.payload) : null,
    ],
  );
}
