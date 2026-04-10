SET @db_name = DATABASE();

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db_name
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'verified_region_slug'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN verified_region_slug VARCHAR(80) NULL AFTER phone'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db_name
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'verified_region_name'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN verified_region_name VARCHAR(120) NULL AFTER verified_region_slug'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db_name
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'region_verified_at'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN region_verified_at DATETIME NULL AFTER verified_region_name'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db_name
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'location_locked'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN location_locked TINYINT(1) NOT NULL DEFAULT 0 AFTER region_verified_at'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db_name
      AND TABLE_NAME = 'leads'
      AND COLUMN_NAME = 'region_slug'
  ),
  'SELECT 1',
  'ALTER TABLE leads ADD COLUMN region_slug VARCHAR(80) NULL AFTER region_3depth_name'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @db_name
      AND TABLE_NAME = 'leads'
      AND INDEX_NAME = 'idx_leads_region_slug'
  ),
  'SELECT 1',
  'ALTER TABLE leads ADD INDEX idx_leads_region_slug (region_slug)'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS location_verification_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  session_key VARCHAR(120) NULL,
  attempted_lat DECIMAL(10, 7) NOT NULL,
  attempted_lng DECIMAL(10, 7) NOT NULL,
  resolved_region_slug VARCHAR(80) NULL,
  resolved_region_name VARCHAR(120) NULL,
  success TINYINT(1) NOT NULL DEFAULT 0,
  device_info VARCHAR(500) NULL,
  ip_address VARCHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_location_verification_logs_user_id (user_id),
  KEY idx_location_verification_logs_region (resolved_region_slug),
  KEY idx_location_verification_logs_created_at (created_at),
  CONSTRAINT fk_location_verification_logs_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

UPDATE leads
SET region_slug = CASE
  WHEN REPLACE(IFNULL(region_1depth_name, ''), ' ', '') LIKE '%울산%' AND REPLACE(IFNULL(region_2depth_name, ''), ' ', '') LIKE '%중구%' AND REPLACE(IFNULL(region_3depth_name, ''), ' ', '') LIKE '%다운%' THEN 'ulsan-junggu-daun'
  WHEN REPLACE(IFNULL(region_1depth_name, ''), ' ', '') LIKE '%경기%' AND REPLACE(IFNULL(region_2depth_name, ''), ' ', '') LIKE '%처인구%' AND REPLACE(IFNULL(region_3depth_name, ''), ' ', '') LIKE '%유방%' THEN 'yongin-cheoin-yubang'
  WHEN REPLACE(IFNULL(region_1depth_name, ''), ' ', '') LIKE '%경기%' AND REPLACE(IFNULL(region_2depth_name, ''), ' ', '') LIKE '%처인구%' AND REPLACE(IFNULL(region_3depth_name, ''), ' ', '') LIKE '%역북%' THEN 'yongin-cheoin-yeokbuk'
  WHEN REPLACE(IFNULL(region_1depth_name, ''), ' ', '') LIKE '%서울%' AND REPLACE(IFNULL(region_2depth_name, ''), ' ', '') LIKE '%마포구%' AND (
    REPLACE(IFNULL(region_3depth_name, ''), ' ', '') LIKE '%서교%' OR
    REPLACE(IFNULL(region_3depth_name, ''), ' ', '') LIKE '%합정%' OR
    REPLACE(IFNULL(region_3depth_name, ''), ' ', '') LIKE '%동교%'
  ) THEN 'seoul-mapo-seogyo'
  ELSE region_slug
END
WHERE region_slug IS NULL OR region_slug = '';
