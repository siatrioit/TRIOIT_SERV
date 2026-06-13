-- Aizpilda darbību žurnālu esošajiem aktīviem (pirms žurnāla ieviešanas izveidotajiem)

INSERT INTO unit_activity_log (id, unit_id, action, description, actor_user_id, actor_name, metadata, created_at)
SELECT
    UUID(),
    u.id,
    'created',
    IF(u.parent_unit_id IS NULL, 'Izveidots galvenais aktīvs', 'Izveidots apakšaktīvs'),
    NULL,
    'Sistēma',
    NULL,
    u.created_at
FROM units u
WHERE NOT EXISTS (
    SELECT 1 FROM unit_activity_log a WHERE a.unit_id = u.id
);
