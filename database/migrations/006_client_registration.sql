-- Klienta reģistrācijas un PVN numurs
ALTER TABLE clients
    ADD COLUMN registration_number VARCHAR(50) NULL AFTER client_type,
    ADD COLUMN vat_number VARCHAR(50) NULL AFTER registration_number,
    ADD INDEX idx_clients_registration (registration_number),
    ADD INDEX idx_clients_vat (vat_number);
