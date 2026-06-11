-- Drošs object_id pievienošana incidents tabulai (ja trūkst pēc vecākas shēmas)
-- phpMyAdmin → SQL vai AUTO_MIGRATE=true

SET @col_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'incidents'
    AND COLUMN_NAME = 'object_id'
);

SET @sql = IF(
  @col_exists = 0,
  'ALTER TABLE incidents ADD COLUMN object_id CHAR(36) NULL AFTER client_id',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
