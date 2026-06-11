-- Objektu statuss: active / closed (arhivēts)
-- phpMyAdmin → SQL vai AUTO_MIGRATE=true

ALTER TABLE client_objects
  ADD COLUMN status ENUM('active','closed') NOT NULL DEFAULT 'active' AFTER is_primary;

UPDATE client_objects SET status = 'closed' WHERE is_active = 0;
UPDATE client_objects SET is_active = 1;
