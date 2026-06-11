-- Materiālu noliktava
CREATE TABLE warehouse_items (
    id                  CHAR(36) PRIMARY KEY,
    sku                 VARCHAR(50),
    name                VARCHAR(255) NOT NULL,
    description         TEXT,
    unit                VARCHAR(20) NOT NULL DEFAULT 'gab',
    quantity_on_hand    DECIMAL(12,3) NOT NULL DEFAULT 0,
    min_quantity        DECIMAL(12,3),
    is_active           TINYINT(1) NOT NULL DEFAULT 1,
    created_by          CHAR(36),
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_warehouse_items_name (name),
    INDEX idx_warehouse_items_sku (sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE warehouse_movements (
    id                  CHAR(36) PRIMARY KEY,
    item_id             CHAR(36) NOT NULL,
    movement_type       ENUM('in', 'out', 'adjust') NOT NULL,
    quantity            DECIMAL(12,3) NOT NULL,
    quantity_after      DECIMAL(12,3) NOT NULL,
    reference_type      VARCHAR(30),
    reference_id        CHAR(36),
    notes               TEXT,
    created_by          CHAR(36),
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES warehouse_items(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_warehouse_movements_item (item_id),
    INDEX idx_warehouse_movements_ref (reference_type, reference_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
