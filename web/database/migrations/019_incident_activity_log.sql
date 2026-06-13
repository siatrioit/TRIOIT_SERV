-- Atgadījumu darbību žurnāls (statusa maiņas, piešķiršana u.c.)

CREATE TABLE IF NOT EXISTS incident_activity_log (
    id              CHAR(36) PRIMARY KEY,
    incident_id     CHAR(36) NOT NULL,
    action          VARCHAR(50) NOT NULL,
    description     TEXT NOT NULL,
    actor_user_id   CHAR(36) NULL,
    actor_name      VARCHAR(255) NULL,
    metadata        JSON NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
    INDEX idx_incident_activity_incident (incident_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO incident_activity_log (id, incident_id, action, description, actor_user_id, actor_name, metadata, created_at)
SELECT
    UUID(),
    i.id,
    'created',
    CONCAT('Reģistrēts atgadījums · statuss: ', COALESCE(st.label, i.status)),
    i.created_by,
    COALESCE(u.full_name, 'Sistēma'),
    JSON_OBJECT('status', i.status),
    i.received_at
FROM incidents i
LEFT JOIN incident_statuses st ON st.code = i.status
LEFT JOIN users u ON u.id = i.created_by
WHERE NOT EXISTS (
    SELECT 1 FROM incident_activity_log a WHERE a.incident_id = i.id
);
