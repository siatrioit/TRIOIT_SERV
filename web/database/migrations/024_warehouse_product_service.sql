-- Preces var būt pakalpojums (bez atlikuma uzskaites)

SET @col_wp_service = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'warehouse_products'
      AND COLUMN_NAME = 'is_service'
);

SET @sql_wp_service = IF(
    @col_wp_service = 0,
    'ALTER TABLE warehouse_products ADD COLUMN is_service TINYINT(1) NOT NULL DEFAULT 0 AFTER sale_price',
    'SELECT 1'
);
PREPARE stmt_wp_service FROM @sql_wp_service;
EXECUTE stmt_wp_service;
DEALLOCATE PREPARE stmt_wp_service;
