-- Objekta atbildīgais staff lietotājs (push un auto-piešķiršanai)
-- phpMyAdmin → SQL vai AUTO_MIGRATE=true

SET @col_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'client_objects'
    AND COLUMN_NAME = 'assigned_user_id'
);

SET @sql = IF(
  @col_exists = 0,
  'ALTER TABLE client_objects ADD COLUMN assigned_user_id CHAR(36) NULL AFTER notes',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'client_objects'
    AND CONSTRAINT_NAME = 'fk_client_objects_assigned_user'
);

SET @sql_fk = IF(
  @fk_exists = 0,
  'ALTER TABLE client_objects ADD CONSTRAINT fk_client_objects_assigned_user FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL',
  'SELECT 1'
);

PREPARE stmt_fk FROM @sql_fk;
EXECUTE stmt_fk;
DEALLOCATE PREPARE stmt_fk;
