-- Preču apakšgrupas un saņemšanas pavadzīmju paplašinājumi

SET @col_wpg_parent = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'warehouse_product_groups'
      AND COLUMN_NAME = 'parent_id'
);

SET @sql_wpg_parent = IF(
    @col_wpg_parent = 0,
    'ALTER TABLE warehouse_product_groups
       ADD COLUMN parent_id CHAR(36) NULL AFTER name,
       ADD INDEX idx_wpg_parent (parent_id),
       ADD CONSTRAINT fk_wpg_parent FOREIGN KEY (parent_id) REFERENCES warehouse_product_groups(id) ON DELETE CASCADE',
    'SELECT 1'
);
PREPARE stmt_wpg_parent FROM @sql_wpg_parent;
EXECUTE stmt_wpg_parent;
DEALLOCATE PREPARE stmt_wpg_parent;

SET @col_wr_supplier_doc = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'warehouse_receipts'
      AND COLUMN_NAME = 'supplier_document_number'
);

SET @sql_wr_supplier_doc = IF(
    @col_wr_supplier_doc = 0,
    'ALTER TABLE warehouse_receipts
       ADD COLUMN supplier_document_number VARCHAR(64) NULL AFTER supplier_id,
       ADD COLUMN operation_description TEXT NULL AFTER notes',
    'SELECT 1'
);
PREPARE stmt_wr_supplier_doc FROM @sql_wr_supplier_doc;
EXECUTE stmt_wr_supplier_doc;
DEALLOCATE PREPARE stmt_wr_supplier_doc;
