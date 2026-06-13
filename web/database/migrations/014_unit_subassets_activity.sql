-- Apakšaktīvi (piesaiste galvenajam aktīvam) un darbību žurnāls

SET @col_parent = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'units'
      AND COLUMN_NAME = 'parent_unit_id'
);

SET @sql_parent = IF(
    @col_parent = 0,
    'ALTER TABLE units
       ADD COLUMN parent_unit_id CHAR(36) NULL AFTER asset_component_id,
       ADD INDEX idx_units_parent (parent_unit_id),
       ADD CONSTRAINT fk_units_parent FOREIGN KEY (parent_unit_id) REFERENCES units(id) ON DELETE RESTRICT',
    'SELECT 1'
);
PREPARE stmt_parent FROM @sql_parent;
EXECUTE stmt_parent;
DEALLOCATE PREPARE stmt_parent;

CREATE TABLE IF NOT EXISTS unit_activity_log (
    id              CHAR(36) PRIMARY KEY,
    unit_id         CHAR(36) NOT NULL,
    action          VARCHAR(50) NOT NULL,
    description     TEXT NOT NULL,
    actor_user_id   CHAR(36) NULL,
    actor_name      VARCHAR(255) NULL,
    metadata        JSON NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
    INDEX idx_unit_activity_unit (unit_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
