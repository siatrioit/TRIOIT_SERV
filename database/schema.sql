-- TRIO-SERV: Field Service Management System
-- PostgreSQL 14+ schema
-- cPanel: ja PostgreSQL nav pieejams, izmantojiet schema.mysql.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- teksta meklēšanai

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'manager', 'technician', 'viewer');
CREATE TYPE client_type AS ENUM ('company', 'private');
CREATE TYPE contract_status AS ENUM ('active', 'expired', 'renewable', 'draft', 'cancelled');
CREATE TYPE unit_type AS ENUM ('computer', 'pos', 'printer', 'network', 'other');
CREATE TYPE unit_status AS ENUM ('active', 'repair', 'decommissioned', 'spare');
CREATE TYPE service_coverage AS ENUM ('contract', 'extra');
CREATE TYPE incident_status AS ENUM ('pending', 'in_progress', 'paused', 'completed', 'cancelled');
CREATE TYPE incident_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE invoice_status AS ENUM ('draft', 'issued', 'sent', 'confirmed', 'paid', 'overdue', 'cancelled');

-- ============================================================
-- USERS & AUTH
-- ============================================================

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    phone           VARCHAR(50),
    role            user_role NOT NULL DEFAULT 'technician',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role ON users (role) WHERE is_active = TRUE;

-- ============================================================
-- CLIENTS
-- ============================================================

CREATE TABLE clients (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    client_type     client_type NOT NULL DEFAULT 'company',
    registration_number VARCHAR(50),
    vat_number      VARCHAR(50),
    address         TEXT,
    city            VARCHAR(100),
    postal_code     VARCHAR(20),
    country         VARCHAR(2) NOT NULL DEFAULT 'LV',
    latitude        DECIMAL(10, 8),
    longitude       DECIMAL(11, 8),
    phone           VARCHAR(50),
    email           VARCHAR(255),
    representative  VARCHAR(255),
    notes           TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clients_name_trgm ON clients USING gin (name gin_trgm_ops);
CREATE INDEX idx_clients_city ON clients (city);
CREATE INDEX idx_clients_location ON clients (latitude, longitude) WHERE latitude IS NOT NULL;
CREATE INDEX idx_clients_active ON clients (is_active) WHERE is_active = TRUE;

-- ============================================================
-- CONTRACTS (līgumi)
-- ============================================================

CREATE TABLE contracts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    contract_number VARCHAR(50) NOT NULL UNIQUE,
    title           VARCHAR(255) NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE,
    status          contract_status NOT NULL DEFAULT 'draft',
    monthly_fee     DECIMAL(12, 2),
    terms           TEXT,
    notes           TEXT,
    document_url    TEXT,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_contract_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_contracts_client ON contracts (client_id);
CREATE INDEX idx_contracts_status ON contracts (status);
CREATE INDEX idx_contracts_dates ON contracts (start_date, end_date);

-- ============================================================
-- UNITS (vienības)
-- ============================================================

CREATE TABLE units (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    contract_id     UUID REFERENCES contracts(id) ON DELETE SET NULL,
    unit_type       unit_type NOT NULL DEFAULT 'other',
    serial_number   VARCHAR(100) NOT NULL,
    model           VARCHAR(255),
    manufacturer    VARCHAR(255),
    status          unit_status NOT NULL DEFAULT 'active',
    location_note   TEXT,
    installed_at    DATE,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_units_serial UNIQUE (serial_number)
);

CREATE INDEX idx_units_client ON units (client_id);
CREATE INDEX idx_units_contract ON units (contract_id);
CREATE INDEX idx_units_serial ON units (serial_number);
CREATE INDEX idx_units_status ON units (status);

-- Vienību vēsture (apkope, remonts)
CREATE TABLE unit_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id         UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    incident_id     UUID, -- FK pievienots pēc incidents tabulas
    action_type     VARCHAR(50) NOT NULL, -- maintenance, repair, replacement, inspection
    description     TEXT NOT NULL,
    performed_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    performed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_unit_history_unit ON unit_history (unit_id, performed_at DESC);

-- ============================================================
-- SERVICES (pakalpojumu katalogs)
-- ============================================================

CREATE TABLE services (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            VARCHAR(50) NOT NULL UNIQUE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    coverage_type   service_coverage NOT NULL DEFAULT 'extra',
    base_price      DECIMAL(12, 2) NOT NULL DEFAULT 0,
    transport_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    unit            VARCHAR(20) NOT NULL DEFAULT 'EUR',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_services_coverage ON services (coverage_type) WHERE is_active = TRUE;
CREATE INDEX idx_services_code ON services (code);

-- ============================================================
-- INCIDENTS (atgadījumi)
-- ============================================================

CREATE TABLE incidents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_number VARCHAR(50) NOT NULL UNIQUE,
    client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    unit_id         UUID REFERENCES units(id) ON DELETE SET NULL,
    contract_id     UUID REFERENCES contracts(id) ON DELETE SET NULL,
    reported_by     VARCHAR(255),
    reported_via      VARCHAR(50), -- phone, email, voice, web
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    status          incident_status NOT NULL DEFAULT 'pending',
    priority        incident_priority NOT NULL DEFAULT 'medium',
    received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_at          TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    resolution      TEXT,
    assigned_to     UUID REFERENCES users(id) ON DELETE SET NULL,
    latitude        DECIMAL(10, 8),
    longitude       DECIMAL(11, 8),
    voice_transcript TEXT,
    ai_confidence   DECIMAL(5, 4), -- 0.0000 - 1.0000
    ai_metadata     JSONB,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incidents_client ON incidents (client_id);
CREATE INDEX idx_incidents_status ON incidents (status);
CREATE INDEX idx_incidents_priority ON incidents (priority);
CREATE INDEX idx_incidents_assigned ON incidents (assigned_to);
CREATE INDEX idx_incidents_received ON incidents (received_at DESC);
CREATE INDEX idx_incidents_location ON incidents (latitude, longitude) WHERE latitude IS NOT NULL;
CREATE INDEX idx_incidents_pending ON incidents (status, priority, received_at)
    WHERE status IN ('pending', 'in_progress', 'paused');

-- Incident ↔ Service (daudzi pret daudziem)
CREATE TABLE incident_services (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id     UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    service_id      UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    quantity        DECIMAL(10, 2) NOT NULL DEFAULT 1,
    unit_price      DECIMAL(12, 2) NOT NULL,
    transport_cost  DECIMAL(12, 2) NOT NULL DEFAULT 0,
    coverage_type   service_coverage NOT NULL,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (incident_id, service_id)
);

CREATE INDEX idx_incident_services_incident ON incident_services (incident_id);

-- Pievienot FK unit_history → incidents
ALTER TABLE unit_history
    ADD CONSTRAINT fk_unit_history_incident
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE SET NULL;

-- ============================================================
-- INVOICES (rēķini)
-- ============================================================

CREATE TABLE invoices (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number  VARCHAR(50) NOT NULL UNIQUE,
    client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    incident_id     UUID REFERENCES incidents(id) ON DELETE SET NULL,
    contract_id     UUID REFERENCES contracts(id) ON DELETE SET NULL,
    status          invoice_status NOT NULL DEFAULT 'draft',
    issue_date      DATE,
    due_date        DATE,
    subtotal        DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tax_rate        DECIMAL(5, 2) NOT NULL DEFAULT 21.00,
    tax_amount      DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total           DECIMAL(12, 2) NOT NULL DEFAULT 0,
    currency        VARCHAR(3) NOT NULL DEFAULT 'EUR',
    notes           TEXT,
    document_url    TEXT,
    sent_at         TIMESTAMPTZ,
    paid_at         TIMESTAMPTZ,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_client ON invoices (client_id);
CREATE INDEX idx_invoices_status ON invoices (status);
CREATE INDEX idx_invoices_due ON invoices (due_date) WHERE status NOT IN ('paid', 'cancelled');
CREATE INDEX idx_invoices_overdue ON invoices (due_date, status)
    WHERE status IN ('sent', 'confirmed', 'overdue');

CREATE TABLE invoice_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    service_id      UUID REFERENCES services(id) ON DELETE SET NULL,
    description     VARCHAR(500) NOT NULL,
    quantity        DECIMAL(10, 2) NOT NULL DEFAULT 1,
    unit_price      DECIMAL(12, 2) NOT NULL,
    transport_cost  DECIMAL(12, 2) NOT NULL DEFAULT 0,
    line_total      DECIMAL(12, 2) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items (invoice_id);

-- ============================================================
-- AI FEEDBACK & AUDIT
-- ============================================================

CREATE TABLE ai_corrections (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id     UUID REFERENCES incidents(id) ON DELETE CASCADE,
    field_name      VARCHAR(100) NOT NULL,
    ai_value        TEXT,
    corrected_value TEXT NOT NULL,
    corrected_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_corrections_incident ON ai_corrections (incident_id);

CREATE TABLE audit_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       UUID NOT NULL,
    action          VARCHAR(50) NOT NULL,
    old_values      JSONB,
    new_values      JSONB,
    ip_address      INET,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_log (entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_log (user_id, created_at DESC);

-- ============================================================
-- TRIGGERS: updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_contracts_updated BEFORE UPDATE ON contracts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_units_updated BEFORE UPDATE ON units
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_services_updated BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_incidents_updated BEFORE UPDATE ON incidents
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- SEED: noklusējuma admin (parole jāmaina pirmajā pieslēgšanās reizē)
-- Parole: ChangeMe123! (bcrypt hash jāģenerē aplikācijā)
-- ============================================================

INSERT INTO services (code, name, coverage_type, base_price, transport_price) VALUES
    ('SRV-001', 'Diagnostika', 'contract', 0.00, 15.00),
    ('SRV-002', 'Remonts uz vietas', 'extra', 45.00, 25.00),
    ('SRV-003', 'POS aparāta apkope', 'contract', 0.00, 20.00),
    ('SRV-004', 'Datortehnikas nomaiņa', 'extra', 80.00, 25.00),
    ('SRV-005', 'Tīkla konfigurācija', 'extra', 60.00, 30.00);
