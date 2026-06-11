-- TRIO-SERV: MySQL/MariaDB schema (cPanel standarta DB)
-- Izmantojiet šo, ja hostingā nav PostgreSQL

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- USERS
CREATE TABLE users (
    id              CHAR(36) PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    phone           VARCHAR(50),
    role            ENUM('admin','manager','technician','viewer') NOT NULL DEFAULT 'technician',
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    last_login_at   DATETIME,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- CLIENTS
CREATE TABLE clients (
    id              CHAR(36) PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    client_type     ENUM('company','private') NOT NULL DEFAULT 'company',
    registration_number VARCHAR(50),
    vat_number      VARCHAR(50),
    address         TEXT,
    city            VARCHAR(100),
    postal_code     VARCHAR(20),
    country         CHAR(2) NOT NULL DEFAULT 'LV',
    latitude        DECIMAL(10,8),
    longitude       DECIMAL(11,8),
    phone           VARCHAR(50),
    email           VARCHAR(255),
    representative  VARCHAR(255),
    notes           TEXT,
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    created_by      CHAR(36),
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_clients_name (name),
    INDEX idx_clients_city (city),
    INDEX idx_clients_location (latitude, longitude),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- CLIENT OBJECTS (apkalpojamie objekti / atrašanās vietas pie klienta)
CREATE TABLE client_objects (
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
    status          ENUM('active','closed') NOT NULL DEFAULT 'active',
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    created_by      CHAR(36),
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_client_objects_client (client_id),
    INDEX idx_client_objects_city (city),
    INDEX idx_client_objects_name (name),
    INDEX idx_client_objects_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- PORTAL USERS (klientu paneļa konti)
CREATE TABLE portal_users (
    id              CHAR(36) PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    phone           VARCHAR(50),
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    created_by      CHAR(36),
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_portal_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- PORTAL ACCESS (pieeja klienta vai objekta līmenī)
CREATE TABLE portal_access (
    id              CHAR(36) PRIMARY KEY,
    portal_user_id  CHAR(36) NOT NULL,
    client_id       CHAR(36) NOT NULL,
    object_id       CHAR(36),
    scope           ENUM('client','object') NOT NULL,
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    created_by      CHAR(36),
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (portal_user_id) REFERENCES portal_users(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (object_id) REFERENCES client_objects(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_portal_access_client (client_id),
    INDEX idx_portal_access_object (object_id),
    INDEX idx_portal_access_user (portal_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- CONTRACTS
CREATE TABLE contracts (
    id              CHAR(36) PRIMARY KEY,
    client_id       CHAR(36) NOT NULL,
    contract_number VARCHAR(50) NOT NULL UNIQUE,
    title           VARCHAR(255) NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE,
    status          ENUM('active','expired','renewable','draft','cancelled') NOT NULL DEFAULT 'draft',
    monthly_fee     DECIMAL(12,2),
    terms           TEXT,
    notes           TEXT,
    document_url    TEXT,
    created_by      CHAR(36),
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_contracts_client (client_id),
    INDEX idx_contracts_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- UNITS
CREATE TABLE units (
    id              CHAR(36) PRIMARY KEY,
    client_id       CHAR(36) NOT NULL,
    object_id       CHAR(36),
    contract_id     CHAR(36),
    unit_type       ENUM('computer','pos','printer','network','other') NOT NULL DEFAULT 'other',
    serial_number   VARCHAR(100) NOT NULL UNIQUE,
    model           VARCHAR(255),
    manufacturer    VARCHAR(255),
    status          ENUM('active','repair','decommissioned','spare') NOT NULL DEFAULT 'active',
    location_note   TEXT,
    installed_at    DATE,
    notes           TEXT,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT,
    FOREIGN KEY (object_id) REFERENCES client_objects(id) ON DELETE SET NULL,
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL,
    INDEX idx_units_client (client_id),
    INDEX idx_units_object (object_id),
    INDEX idx_units_serial (serial_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- SERVICES
CREATE TABLE services (
    id              CHAR(36) PRIMARY KEY,
    code            VARCHAR(50) NOT NULL UNIQUE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    coverage_type   ENUM('contract','extra') NOT NULL DEFAULT 'extra',
    base_price      DECIMAL(12,2) NOT NULL DEFAULT 0,
    transport_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    unit            VARCHAR(20) NOT NULL DEFAULT 'EUR',
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- INCIDENTS
CREATE TABLE incidents (
    id              CHAR(36) PRIMARY KEY,
    incident_number VARCHAR(50) NOT NULL UNIQUE,
    client_id       CHAR(36) NOT NULL,
    object_id       CHAR(36),
    unit_id         CHAR(36),
    contract_id     CHAR(36),
    reported_by     VARCHAR(255),
    reported_via      VARCHAR(50),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    status          ENUM('pending','in_progress','paused','completed','cancelled') NOT NULL DEFAULT 'pending',
    priority        ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
    received_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    due_at          DATETIME,
    completed_at    DATETIME,
    resolution      TEXT,
    assigned_to     CHAR(36),
    latitude        DECIMAL(10,8),
    longitude       DECIMAL(11,8),
    voice_transcript TEXT,
    ai_confidence   DECIMAL(5,4),
    ai_metadata     JSON,
    created_by      CHAR(36),
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT,
    FOREIGN KEY (object_id) REFERENCES client_objects(id) ON DELETE SET NULL,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL,
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_incidents_status (status),
    INDEX idx_incidents_priority (priority),
    INDEX idx_incidents_received (received_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- INCIDENT MESSAGES (saziņa pie izsaukuma)
CREATE TABLE incident_messages (
    id                  CHAR(36) PRIMARY KEY,
    incident_id         CHAR(36) NOT NULL,
    author_type         ENUM('staff','portal') NOT NULL,
    author_staff_id     CHAR(36),
    author_portal_id    CHAR(36),
    author_name         VARCHAR(255) NOT NULL,
    body                TEXT NOT NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
    FOREIGN KEY (author_staff_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (author_portal_id) REFERENCES portal_users(id) ON DELETE SET NULL,
    INDEX idx_incident_messages_incident (incident_id),
    INDEX idx_incident_messages_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE incident_message_reads (
    incident_id     CHAR(36) NOT NULL,
    reader_type     ENUM('staff','portal') NOT NULL,
    reader_id       CHAR(36) NOT NULL,
    last_read_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (incident_id, reader_type, reader_id),
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- INVOICES
CREATE TABLE invoices (
    id              CHAR(36) PRIMARY KEY,
    invoice_number  VARCHAR(50) NOT NULL UNIQUE,
    client_id       CHAR(36) NOT NULL,
    incident_id     CHAR(36),
    contract_id     CHAR(36),
    status          ENUM('draft','issued','sent','confirmed','paid','overdue','cancelled') NOT NULL DEFAULT 'draft',
    issue_date      DATE,
    due_date        DATE,
    subtotal        DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_rate        DECIMAL(5,2) NOT NULL DEFAULT 21.00,
    tax_amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
    total           DECIMAL(12,2) NOT NULL DEFAULT 0,
    currency        CHAR(3) NOT NULL DEFAULT 'EUR',
    notes           TEXT,
    document_url    TEXT,
    sent_at         DATETIME,
    paid_at         DATETIME,
    created_by      CHAR(36),
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT,
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE SET NULL,
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_invoices_status (status),
    INDEX idx_invoices_due (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- WAREHOUSE (materiālu noliktava)
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

SET FOREIGN_KEY_CHECKS = 1;
