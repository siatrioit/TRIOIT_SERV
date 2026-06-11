-- Admin lietotājs — izpildi PĒC schema.mysql.sql
--
-- 1. Uz servera (vai lokāli pēc npm install):
--    cd backend && node scripts/hash-password.js "TrioServ2026!"
--
-- 2. Ielīmē saņemto hash zemāk un palaid šo SQL phpMyAdmin:

-- INSERT INTO users (id, email, password_hash, full_name, role, is_active)
-- VALUES (
--   'a0000000-0000-4000-8000-000000000001',
--   'admin@trioit.lv',
--   'IELIEC_HASH_TE',
--   'Administrators',
--   'admin',
--   1
-- );

-- Pagaidu: vari izveidot lietotāju arī caur API, kad tas darbojas (nākotnē POST /auth/register admin only).
