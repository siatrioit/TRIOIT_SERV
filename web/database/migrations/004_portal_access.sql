-- Klientu portāla lietotāji un pieejas tiesības
-- phpMyAdmin → SQL vai AUTO_MIGRATE=true

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
