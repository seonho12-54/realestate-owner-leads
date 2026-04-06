import mysql, { type Pool, type PoolConnection, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";

import { getEnv } from "@/lib/env";

declare global {
  // eslint-disable-next-line no-var
  var __realEstatePool: Pool | undefined;
}

export type DbRow = RowDataPacket;
export type DbMutation = ResultSetHeader;

export function getPool(): Pool {
  if (global.__realEstatePool) {
    return global.__realEstatePool;
  }

  const env = getEnv();

  global.__realEstatePool = mysql.createPool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: "utf8mb4",
  });

  return global.__realEstatePool;
}

export async function withTransaction<T>(callback: (connection: PoolConnection) => Promise<T>): Promise<T> {
  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

