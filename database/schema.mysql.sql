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
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL,
    INDEX idx_units_client (client_id),
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
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL,
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_incidents_status (status),
    INDEX idx_incidents_priority (priority),
    INDEX idx_incidents_received (received_at)
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

SET FOREIGN_KEY_CHECKS = 1;
