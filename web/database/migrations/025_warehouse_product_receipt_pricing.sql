-- Preču kartiņa un saņemšanas pavadzīmju paplašinājumi

SET @col_wp_secondary = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'warehouse_products' AND COLUMN_NAME = 'secondary_name'
);
SET @sql_wp_secondary = IF(
    @col_wp_secondary = 0,
    'ALTER TABLE warehouse_products ADD COLUMN secondary_name VARCHAR(255) NULL AFTER name',
    'SELECT 1'
);
PREPARE stmt_wp_secondary FROM @sql_wp_secondary;
EXECUTE stmt_wp_secondary;
DEALLOCATE PREPARE stmt_wp_secondary;

SET @col_wp_vat = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'warehouse_products' AND COLUMN_NAME = 'vat_rate'
);
SET @sql_wp_vat = IF(
    @col_wp_vat = 0,
    'ALTER TABLE warehouse_products ADD COLUMN vat_rate DECIMAL(5,2) NOT NULL DEFAULT 21.00 AFTER sale_price',
    'SELECT 1'
);
PREPARE stmt_wp_vat FROM @sql_wp_vat;
EXECUTE stmt_wp_vat;
DEALLOCATE PREPARE stmt_wp_vat;

SET @col_wrl_markup = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'warehouse_receipt_lines' AND COLUMN_NAME = 'markup_percent'
);
SET @sql_wrl_markup = IF(
    @col_wrl_markup = 0,
    'ALTER TABLE warehouse_receipt_lines
       ADD COLUMN markup_percent DECIMAL(8,2) NULL AFTER unit_price,
       ADD COLUMN sale_price DECIMAL(12,2) NULL AFTER markup_percent',
    'SELECT 1'
);
PREPARE stmt_wrl_markup FROM @sql_wrl_markup;
EXECUTE stmt_wrl_markup;
DEALLOCATE PREPARE stmt_wrl_markup;

SET @col_wr_paid = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'warehouse_receipts' AND COLUMN_NAME = 'amount_paid'
);
SET @sql_wr_paid = IF(
    @col_wr_paid = 0,
    'ALTER TABLE warehouse_receipts ADD COLUMN amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER notes',
    'SELECT 1'
);
PREPARE stmt_wr_paid FROM @sql_wr_paid;
EXECUTE stmt_wr_paid;
DEALLOCATE PREPARE stmt_wr_paid;
