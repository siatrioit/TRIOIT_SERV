-- Portāla lietotāju lomas pie piekļuves ieraksta
-- phpMyAdmin → SQL vai AUTO_MIGRATE=true

SET @col_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'portal_access'
    AND COLUMN_NAME = 'portal_role'
);

SET @sql = IF(
  @col_exists = 0,
  "ALTER TABLE portal_access ADD COLUMN portal_role ENUM('viewer','operator','manager') NOT NULL DEFAULT 'operator' AFTER scope",
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
