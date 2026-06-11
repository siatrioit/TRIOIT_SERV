-- PWA Web Push abonementi (staff lietotāji, vairākas ierīces)
-- phpMyAdmin → SQL vai AUTO_MIGRATE=true

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id              CHAR(36) PRIMARY KEY,
    user_id         CHAR(36) NOT NULL,
    endpoint        TEXT NOT NULL,
    endpoint_hash   CHAR(64) NOT NULL,
    p256dh          VARCHAR(255) NOT NULL,
    auth            VARCHAR(255) NOT NULL,
    user_agent      VARCHAR(512),
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_push_endpoint_hash (endpoint_hash),
    INDEX idx_push_subscriptions_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
