-- Vēlamais piecenojums % preces kartiņā

SET @col_wp_desired_markup = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'warehouse_products' AND COLUMN_NAME = 'desired_markup_percent'
);
SET @sql_wp_desired_markup = IF(
    @col_wp_desired_markup = 0,
    'ALTER TABLE warehouse_products ADD COLUMN desired_markup_percent DECIMAL(8,2) NULL AFTER sale_price',
    'SELECT 1'
);
PREPARE stmt_wp_desired_markup FROM @sql_wp_desired_markup;
EXECUTE stmt_wp_desired_markup;
DEALLOCATE PREPARE stmt_wp_desired_markup;
