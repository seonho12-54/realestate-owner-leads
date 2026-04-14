SET @db_name = DATABASE();

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db_name
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'phone_normalized'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN phone_normalized VARCHAR(20) NULL AFTER phone'
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
      AND COLUMN_NAME = 'phone_verified_at'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN phone_verified_at DATETIME NULL AFTER phone_normalized'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @db_name
      AND TABLE_NAME = 'users'
      AND INDEX_NAME = 'idx_users_phone_normalized'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD INDEX idx_users_phone_normalized (phone_normalized)'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS phone_verification_challenges (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  verification_key VARCHAR(64) NOT NULL,
  purpose VARCHAR(30) NOT NULL DEFAULT 'signup',
  phone_normalized VARCHAR(20) NOT NULL,
  verification_code VARCHAR(8) NOT NULL,
  request_ip VARCHAR(64) NULL,
  user_agent VARCHAR(500) NULL,
  expires_at DATETIME NOT NULL,
  verified_at DATETIME NULL,
  consumed_at DATETIME NULL,
  consumed_by_user_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_phone_verification_key (verification_key),
  KEY idx_phone_verification_lookup (phone_normalized, purpose, created_at),
  KEY idx_phone_verification_consumed_by (consumed_by_user_id),
  CONSTRAINT fk_phone_verification_consumed_by FOREIGN KEY (consumed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

UPDATE offices
SET address = '울산광역시 중구 다운로 160'
WHERE slug = 'main-office';
