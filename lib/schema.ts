import type { DbRow } from "@/lib/db";
import { getPool } from "@/lib/db";
import { getEnv } from "@/lib/env";

type InfoSchemaRow = DbRow & {
  present: number;
};

let ensureSchemaPromise: Promise<void> | null = null;

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const [rows] = await getPool().execute<InfoSchemaRow[]>(
    `
      SELECT 1 AS present
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
      LIMIT 1
    `,
    [getEnv().DB_NAME, tableName, columnName],
  );

  return rows.length > 0;
}

async function addColumnIfMissing(tableName: string, columnName: string, definition: string): Promise<void> {
  if (await columnExists(tableName, columnName)) {
    return;
  }

  await getPool().query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`);
}

async function createBaseTables(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS offices (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(100) NOT NULL,
      phone VARCHAR(30) NULL,
      address VARCHAR(255) NULL,
      description VARCHAR(255) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_offices_slug (slug)
    )
  `);

  await getPool().query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      email VARCHAR(191) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL,
      phone VARCHAR(30) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      last_login_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_users_email (email)
    )
  `);

  await getPool().query(`
    CREATE TABLE IF NOT EXISTS admins (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      office_id BIGINT UNSIGNED NULL,
      email VARCHAR(191) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL,
      role ENUM('super', 'manager') NOT NULL DEFAULT 'manager',
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      last_login_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_admins_email (email)
    )
  `);

  await getPool().query(`
    CREATE TABLE IF NOT EXISTS leads (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      office_id BIGINT UNSIGNED NOT NULL,
      owner_name VARCHAR(100) NOT NULL,
      phone VARCHAR(30) NOT NULL,
      email VARCHAR(191) NULL,
      property_type ENUM('apartment', 'officetel', 'villa', 'house', 'commercial', 'land', 'other') NOT NULL,
      transaction_type ENUM('sale', 'jeonse', 'monthly', 'consult') NOT NULL,
      address_line1 VARCHAR(255) NOT NULL,
      address_line2 VARCHAR(255) NULL,
      postal_code VARCHAR(20) NULL,
      area_m2 DECIMAL(10, 2) NULL,
      price_krw BIGINT UNSIGNED NULL,
      deposit_krw BIGINT UNSIGNED NULL,
      monthly_rent_krw BIGINT UNSIGNED NULL,
      move_in_date VARCHAR(50) NULL,
      contact_time VARCHAR(100) NULL,
      description TEXT NULL,
      privacy_consent TINYINT(1) NOT NULL DEFAULT 0,
      marketing_consent TINYINT(1) NOT NULL DEFAULT 0,
      status ENUM('new', 'contacted', 'reviewing', 'completed', 'closed') NOT NULL DEFAULT 'new',
      utm_source VARCHAR(100) NULL,
      utm_medium VARCHAR(100) NULL,
      utm_campaign VARCHAR(100) NULL,
      utm_term VARCHAR(100) NULL,
      utm_content VARCHAR(100) NULL,
      referrer_url VARCHAR(500) NULL,
      landing_url VARCHAR(500) NULL,
      user_agent VARCHAR(500) NULL,
      submitted_ip VARCHAR(64) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    )
  `);

  await getPool().query(`
    CREATE TABLE IF NOT EXISTS lead_photos (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      lead_id BIGINT UNSIGNED NOT NULL,
      s3_key VARCHAR(500) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      content_type VARCHAR(100) NOT NULL,
      file_size BIGINT UNSIGNED NOT NULL,
      display_order INT UNSIGNED NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    )
  `);

  await getPool().query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      admin_id BIGINT UNSIGNED NULL,
      action_type VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50) NOT NULL,
      entity_id BIGINT UNSIGNED NULL,
      request_ip VARCHAR(64) NULL,
      user_agent VARCHAR(500) NULL,
      payload_json JSON NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    )
  `);
}

async function ensureLeadColumns(): Promise<void> {
  await addColumnIfMissing("leads", "user_id", "BIGINT UNSIGNED NULL AFTER `office_id`");
  await addColumnIfMissing("leads", "listing_title", "VARCHAR(160) NOT NULL DEFAULT '중구 등록 매물' AFTER `user_id`");
  await addColumnIfMissing("leads", "region_1depth_name", "VARCHAR(40) NULL AFTER `postal_code`");
  await addColumnIfMissing("leads", "region_2depth_name", "VARCHAR(40) NULL AFTER `region_1depth_name`");
  await addColumnIfMissing("leads", "region_3depth_name", "VARCHAR(60) NULL AFTER `region_2depth_name`");
  await addColumnIfMissing("leads", "latitude", "DECIMAL(10, 7) NULL AFTER `region_3depth_name`");
  await addColumnIfMissing("leads", "longitude", "DECIMAL(10, 7) NULL AFTER `latitude`");
  await addColumnIfMissing("leads", "location_verified", "TINYINT(1) NOT NULL DEFAULT 0 AFTER `longitude`");
  await addColumnIfMissing("leads", "admin_memo", "TEXT NULL AFTER `description`");
  await addColumnIfMissing("leads", "is_published", "TINYINT(1) NOT NULL DEFAULT 0 AFTER `status`");
  await addColumnIfMissing("leads", "published_at", "DATETIME NULL AFTER `is_published`");
  await addColumnIfMissing("leads", "published_by_admin_id", "BIGINT UNSIGNED NULL AFTER `published_at`");
  await addColumnIfMissing("leads", "view_count", "INT UNSIGNED NOT NULL DEFAULT 0 AFTER `published_by_admin_id`");
}

export async function ensureRuntimeSchema(): Promise<void> {
  if (!ensureSchemaPromise) {
    ensureSchemaPromise = (async () => {
      await createBaseTables();
      await ensureLeadColumns();
    })().catch((error) => {
      ensureSchemaPromise = null;
      throw error;
    });
  }

  await ensureSchemaPromise;
}
