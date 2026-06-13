-- Darbu izpildes akti ar klienta parakstu

CREATE TABLE IF NOT EXISTS incident_completion_acts (
    id                  CHAR(36) PRIMARY KEY,
    incident_id         CHAR(36) NOT NULL UNIQUE,
    staff_requested_at  DATETIME NULL,
    staff_requested_by  CHAR(36) NULL,
    client_signer_name  VARCHAR(255) NULL,
    signature_type      ENUM('typed', 'drawn') NOT NULL DEFAULT 'typed',
    signature_data      MEDIUMTEXT NULL,
    client_signed_at    DATETIME NULL,
    act_number          VARCHAR(64) NULL,
    act_pdf_path        VARCHAR(500) NULL,
    act_generated_at    DATETIME NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
    INDEX idx_completion_signed (client_signed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
