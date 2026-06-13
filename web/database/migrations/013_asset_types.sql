-- Konfigurējami aktīvu tipi un apakšsadaļas (komponentes)

CREATE TABLE IF NOT EXISTS asset_types (
    id              CHAR(36) PRIMARY KEY,
    code            VARCHAR(50) NOT NULL UNIQUE,
    name            VARCHAR(255) NOT NULL,
    sort_order      INT NOT NULL DEFAULT 0,
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_asset_types_active (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS asset_type_components (
    id              CHAR(36) PRIMARY KEY,
    asset_type_id   CHAR(36) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    sort_order      INT NOT NULL DEFAULT 0,
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (asset_type_id) REFERENCES asset_types(id) ON DELETE CASCADE,
    INDEX idx_atc_type (asset_type_id, is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO asset_types (id, code, name, sort_order)
SELECT * FROM (
    SELECT 'a1000001-0001-4000-8000-000000000001' AS id, 'computer' AS code, 'Dators' AS name, 10 AS sort_order
    UNION ALL SELECT 'a1000001-0001-4000-8000-000000000002', 'pos', 'POS kase', 20
    UNION ALL SELECT 'a1000001-0001-4000-8000-000000000003', 'printer', 'Printeris', 30
    UNION ALL SELECT 'a1000001-0001-4000-8000-000000000004', 'network', 'Tīkla iekārta', 40
    UNION ALL SELECT 'a1000001-0001-4000-8000-000000000005', 'other', 'Cits', 50
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM asset_types LIMIT 1);

SET @col_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'units'
      AND COLUMN_NAME = 'asset_type_id'
);

SET @sql = IF(
    @col_exists = 0,
    'ALTER TABLE units
       ADD COLUMN asset_type_id CHAR(36) NULL AFTER unit_type,
       ADD COLUMN asset_component_id CHAR(36) NULL AFTER asset_type_id,
       ADD CONSTRAINT fk_units_asset_type FOREIGN KEY (asset_type_id) REFERENCES asset_types(id) ON DELETE SET NULL,
       ADD CONSTRAINT fk_units_asset_component FOREIGN KEY (asset_component_id) REFERENCES asset_type_components(id) ON DELETE SET NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE units u
JOIN asset_types t ON t.code = u.unit_type
SET u.asset_type_id = t.id
WHERE u.asset_type_id IS NULL;

SET @unit_type_varchar = (
    SELECT DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'units'
      AND COLUMN_NAME = 'unit_type'
);

SET @sql2 = IF(
    @unit_type_varchar = 'enum',
    "ALTER TABLE units MODIFY COLUMN unit_type VARCHAR(50) NOT NULL DEFAULT 'other'",
    'SELECT 1'
);
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

SET @inc_col = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'incidents'
      AND COLUMN_NAME = 'asset_component_id'
);

SET @sql3 = IF(
    @inc_col = 0,
    'ALTER TABLE incidents
       ADD COLUMN asset_component_id CHAR(36) NULL AFTER unit_id,
       ADD CONSTRAINT fk_incidents_asset_component FOREIGN KEY (asset_component_id) REFERENCES asset_type_components(id) ON DELETE SET NULL',
    'SELECT 1'
);
PREPARE stmt3 FROM @sql3;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;
