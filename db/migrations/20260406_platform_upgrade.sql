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
);

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS user_id BIGINT UNSIGNED NULL AFTER office_id,
  ADD COLUMN IF NOT EXISTS listing_title VARCHAR(160) NOT NULL DEFAULT '중구 등록 매물' AFTER user_id,
  ADD COLUMN IF NOT EXISTS region_1depth_name VARCHAR(40) NULL AFTER postal_code,
  ADD COLUMN IF NOT EXISTS region_2depth_name VARCHAR(40) NULL AFTER region_1depth_name,
  ADD COLUMN IF NOT EXISTS region_3depth_name VARCHAR(60) NULL AFTER region_2depth_name,
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7) NULL AFTER region_3depth_name,
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7) NULL AFTER latitude,
  ADD COLUMN IF NOT EXISTS location_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER longitude,
  ADD COLUMN IF NOT EXISTS admin_memo TEXT NULL AFTER description,
  ADD COLUMN IF NOT EXISTS is_published TINYINT(1) NOT NULL DEFAULT 0 AFTER status,
  ADD COLUMN IF NOT EXISTS published_at DATETIME NULL AFTER is_published,
  ADD COLUMN IF NOT EXISTS published_by_admin_id BIGINT UNSIGNED NULL AFTER published_at,
  ADD COLUMN IF NOT EXISTS view_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER published_by_admin_id;

ALTER TABLE leads
  ADD INDEX idx_leads_user_id (user_id),
  ADD INDEX idx_leads_is_published (is_published),
  ADD INDEX idx_leads_region (region_2depth_name, region_3depth_name),
  ADD INDEX idx_leads_transaction_type (transaction_type);

