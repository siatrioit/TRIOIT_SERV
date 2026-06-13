-- Komerciālā noliktava: preču grupas, preces, pavadzīmes, klientu lomas

CREATE TABLE IF NOT EXISTS warehouse_product_groups (
    id              CHAR(36) PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    sort_order      INT NOT NULL DEFAULT 0,
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_wpg_name (name),
    INDEX idx_wpg_sort (sort_order, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS warehouse_products (
    id                  CHAR(36) PRIMARY KEY,
    group_id            CHAR(36),
    sku                 VARCHAR(50),
    name                VARCHAR(255) NOT NULL,
    description         TEXT,
    unit                VARCHAR(20) NOT NULL DEFAULT 'gab',
    quantity_on_hand    DECIMAL(12,3) NOT NULL DEFAULT 0,
    min_quantity        DECIMAL(12,3),
    purchase_price      DECIMAL(12,2),
    sale_price          DECIMAL(12,2),
    is_active           TINYINT(1) NOT NULL DEFAULT 1,
    created_by          CHAR(36),
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES warehouse_product_groups(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_wp_group (group_id),
    INDEX idx_wp_name (name),
    INDEX idx_wp_sku (sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS warehouse_product_movements (
    id                  CHAR(36) PRIMARY KEY,
    product_id          CHAR(36) NOT NULL,
    movement_type       ENUM('in', 'out', 'adjust') NOT NULL,
    quantity            DECIMAL(12,3) NOT NULL,
    quantity_after      DECIMAL(12,3) NOT NULL,
    reference_type      VARCHAR(30),
    reference_id        CHAR(36),
    notes               TEXT,
    created_by          CHAR(36),
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES warehouse_products(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_wpm_product (product_id),
    INDEX idx_wpm_ref (reference_type, reference_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET @col_supplier = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clients' AND COLUMN_NAME = 'is_supplier'
);
SET @sql_supplier = IF(
    @col_supplier = 0,
    'ALTER TABLE clients
       ADD COLUMN is_supplier TINYINT(1) NOT NULL DEFAULT 0 AFTER notes,
       ADD COLUMN is_buyer TINYINT(1) NOT NULL DEFAULT 0 AFTER is_supplier,
       ADD COLUMN is_service_client TINYINT(1) NOT NULL DEFAULT 0 AFTER is_buyer,
       ADD INDEX idx_clients_supplier (is_supplier),
       ADD INDEX idx_clients_buyer (is_buyer),
       ADD INDEX idx_clients_service (is_service_client)',
    'SELECT 1'
);
PREPARE stmt_supplier FROM @sql_supplier;
EXECUTE stmt_supplier;
DEALLOCATE PREPARE stmt_supplier;

UPDATE clients SET is_service_client = 1 WHERE is_active = 1 AND is_service_client = 0;

CREATE TABLE IF NOT EXISTS warehouse_receipts (
    id                  CHAR(36) PRIMARY KEY,
    document_number     VARCHAR(50) NOT NULL,
    supplier_id         CHAR(36) NOT NULL,
    document_date       DATE NOT NULL,
    status              ENUM('draft', 'posted', 'cancelled') NOT NULL DEFAULT 'draft',
    notes               TEXT,
    posted_at           DATETIME,
    created_by          CHAR(36),
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES clients(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY uq_warehouse_receipts_number (document_number),
    INDEX idx_wr_supplier (supplier_id),
    INDEX idx_wr_date (document_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS warehouse_receipt_lines (
    id                  CHAR(36) PRIMARY KEY,
    receipt_id          CHAR(36) NOT NULL,
    product_id          CHAR(36) NOT NULL,
    quantity            DECIMAL(12,3) NOT NULL,
    unit_price          DECIMAL(12,2),
    sort_order          INT NOT NULL DEFAULT 0,
    FOREIGN KEY (receipt_id) REFERENCES warehouse_receipts(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES warehouse_products(id) ON DELETE RESTRICT,
    INDEX idx_wrl_receipt (receipt_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS warehouse_issues (
    id                  CHAR(36) PRIMARY KEY,
    document_number     VARCHAR(50) NOT NULL,
    buyer_id            CHAR(36) NOT NULL,
    document_date       DATE NOT NULL,
    status              ENUM('draft', 'posted', 'cancelled') NOT NULL DEFAULT 'draft',
    notes               TEXT,
    posted_at           DATETIME,
    created_by          CHAR(36),
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer_id) REFERENCES clients(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY uq_warehouse_issues_number (document_number),
    INDEX idx_wi_buyer (buyer_id),
    INDEX idx_wi_date (document_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS warehouse_issue_lines (
    id                  CHAR(36) PRIMARY KEY,
    issue_id            CHAR(36) NOT NULL,
    product_id          CHAR(36) NOT NULL,
    quantity            DECIMAL(12,3) NOT NULL,
    unit_price          DECIMAL(12,2),
    sort_order          INT NOT NULL DEFAULT 0,
    FOREIGN KEY (issue_id) REFERENCES warehouse_issues(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES warehouse_products(id) ON DELETE RESTRICT,
    INDEX idx_wil_issue (issue_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
