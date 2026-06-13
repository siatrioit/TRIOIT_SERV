-- Izrakstīšanas pavadzīmju paplašinājumi (līdzvērtīgi saņemšanai)

SET @col_wi_buyer_doc = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'warehouse_issues'
      AND COLUMN_NAME = 'buyer_document_number'
);

SET @sql_wi_buyer_doc = IF(
    @col_wi_buyer_doc = 0,
    'ALTER TABLE warehouse_issues
       ADD COLUMN buyer_document_number VARCHAR(64) NULL AFTER buyer_id,
       ADD COLUMN operation_description TEXT NULL AFTER notes,
       ADD COLUMN delivery_address TEXT NULL AFTER operation_description',
    'SELECT 1'
);
PREPARE stmt_wi_buyer_doc FROM @sql_wi_buyer_doc;
EXECUTE stmt_wi_buyer_doc;
DEALLOCATE PREPARE stmt_wi_buyer_doc;
