-- Ziņas pie izsaukuma (saziņa klienta portāls ↔ meistars)
-- phpMyAdmin → SQL vai AUTO_MIGRATE=true

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
