-- Uzņēmuma rekvizīti PDF aktiem un darbinieku paraksti

CREATE TABLE IF NOT EXISTS company_settings (
    id                  CHAR(36) PRIMARY KEY,
    company_name        VARCHAR(255) NOT NULL DEFAULT '',
    header_line1        VARCHAR(255) NULL,
    header_line2        VARCHAR(255) NULL,
    header_line3        VARCHAR(255) NULL,
    registration_number VARCHAR(50) NULL,
    vat_number          VARCHAR(50) NULL,
    address             TEXT NULL,
    phone               VARCHAR(50) NULL,
    email               VARCHAR(255) NULL,
    bank_name           VARCHAR(255) NULL,
    bank_account        VARCHAR(100) NULL,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by          CHAR(36) NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO company_settings (id, company_name)
SELECT '11111111-1111-4111-8111-111111111099', 'TRIO IT'
WHERE NOT EXISTS (SELECT 1 FROM company_settings LIMIT 1);

SET @col_user_sig = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'signature_data'
);

SET @sql_user_sig = IF(
    @col_user_sig = 0,
    'ALTER TABLE users ADD COLUMN signature_data MEDIUMTEXT NULL AFTER phone',
    'SELECT 1'
);
PREPARE stmt_user_sig FROM @sql_user_sig;
EXECUTE stmt_user_sig;
DEALLOCATE PREPARE stmt_user_sig;
