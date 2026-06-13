-- Atgadījumu statusu nosaukumi, sinhronizācija un žurnāla teksti

SET @col_sync_label = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'incident_statuses'
      AND COLUMN_NAME = 'sync_activity_label'
);

SET @sql_sync_label = IF(
    @col_sync_label = 0,
    'ALTER TABLE incident_statuses ADD COLUMN sync_activity_label VARCHAR(100) NULL AFTER sync_unit_status',
    'SELECT 1'
);
PREPARE stmt_sync_label FROM @sql_sync_label;
EXECUTE stmt_sync_label;
DEALLOCATE PREPARE stmt_sync_label;

UPDATE incident_statuses SET
    label = 'Atgadījums',
    sync_unit_status = 'repair',
    sync_activity_label = 'Izsaukts meistars'
WHERE code = 'pending';

UPDATE incident_statuses SET
    label = 'Remontā',
    sync_unit_status = 'repair',
    sync_activity_label = 'Ierīce remontā'
WHERE code = 'in_progress';

UPDATE incident_statuses SET
    label = 'Remontā',
    sync_unit_status = 'repair',
    sync_activity_label = 'Ierīce remontā'
WHERE code = 'paused';

UPDATE incident_statuses SET
    label = 'Aktīva',
    sync_unit_status = 'active',
    sync_activity_label = 'Ierīce aktīva'
WHERE code = 'completed';

UPDATE incident_statuses SET
    label = 'Aktīva',
    sync_unit_status = 'active',
    sync_activity_label = 'Ierīce aktīva'
WHERE code = 'cancelled';
