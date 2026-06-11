-- Darba laiks un materiāli pie atgadījuma
CREATE TABLE incident_work_logs (
    id                  CHAR(36) PRIMARY KEY,
    incident_id         CHAR(36) NOT NULL,
    user_id             CHAR(36),
    work_date           DATE NOT NULL,
    duration_minutes    INT NOT NULL,
    description         TEXT NOT NULL,
    work_type           VARCHAR(50),
    created_by          CHAR(36),
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_incident_work_incident (incident_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE incident_materials (
    id                  CHAR(36) PRIMARY KEY,
    incident_id         CHAR(36) NOT NULL,
    warehouse_item_id   CHAR(36) NOT NULL,
    quantity            DECIMAL(12,3) NOT NULL,
    notes               TEXT,
    used_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    used_by             CHAR(36),
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_item_id) REFERENCES warehouse_items(id) ON DELETE RESTRICT,
    FOREIGN KEY (used_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_incident_materials_incident (incident_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
