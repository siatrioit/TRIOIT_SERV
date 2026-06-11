-- Klientu objekti (automātiski: npm run db:migrate vai AUTO_MIGRATE=true)

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS client_objects (
    id              CHAR(36) PRIMARY KEY,
    client_id       CHAR(36) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    object_code     VARCHAR(50),
    address         TEXT,
    city            VARCHAR(100),
    postal_code     VARCHAR(20),
    country         CHAR(2) NOT NULL DEFAULT 'LV',
    latitude        DECIMAL(10,8),
    longitude       DECIMAL(11,8),
    contact_name    VARCHAR(255),
    contact_phone   VARCHAR(50),
    contact_email   VARCHAR(255),
    access_notes    TEXT,
    notes           TEXT,
    is_primary      TINYINT(1) NOT NULL DEFAULT 0,
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    created_by      CHAR(36),
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_client_objects_client (client_id),
    INDEX idx_client_objects_city (city),
    INDEX idx_client_objects_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE units
    ADD COLUMN object_id CHAR(36) NULL AFTER client_id,
    ADD INDEX idx_units_object (object_id),
    ADD CONSTRAINT fk_units_object FOREIGN KEY (object_id) REFERENCES client_objects(id) ON DELETE SET NULL;

ALTER TABLE incidents
    ADD COLUMN object_id CHAR(36) NULL AFTER client_id,
    ADD CONSTRAINT fk_incidents_object FOREIGN KEY (object_id) REFERENCES client_objects(id) ON DELETE SET NULL;

SET FOREIGN_KEY_CHECKS = 1;
