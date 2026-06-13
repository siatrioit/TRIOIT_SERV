-- Konfigurējami atgadījumu statusi un saite uz aktīva statusu

CREATE TABLE IF NOT EXISTS incident_statuses (
    id                  CHAR(36) PRIMARY KEY,
    code                VARCHAR(50) NOT NULL UNIQUE,
    label               VARCHAR(100) NOT NULL,
    category            ENUM('open', 'closed') NOT NULL DEFAULT 'open',
    sort_order          INT NOT NULL DEFAULT 0,
    badge_tone          VARCHAR(30) NULL,
    sync_unit_status    VARCHAR(30) NULL,
    is_active           TINYINT(1) NOT NULL DEFAULT 1,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_incident_statuses_active (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO incident_statuses (id, code, label, category, sort_order, badge_tone, sync_unit_status)
SELECT * FROM (
    SELECT '11111111-1111-4111-8111-111111111101' AS id, 'pending' AS code, 'Gaida' AS label, 'open' AS category, 10 AS sort_order, 'yellow' AS badge_tone, NULL AS sync_unit_status
    UNION ALL SELECT '11111111-1111-4111-8111-111111111102', 'in_progress', 'Darbā', 'open', 20, 'blue', 'repair'
    UNION ALL SELECT '11111111-1111-4111-8111-111111111103', 'paused', 'Pauze', 'open', 30, 'gray', 'repair'
    UNION ALL SELECT '11111111-1111-4111-8111-111111111104', 'completed', 'Izpildīts', 'closed', 40, 'green', 'active'
    UNION ALL SELECT '11111111-1111-4111-8111-111111111105', 'cancelled', 'Atcelts', 'closed', 50, 'red', 'active'
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM incident_statuses LIMIT 1);
