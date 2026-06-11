-- Admin lietotājs — izpildi PĒC schema.mysql.sql
-- phpMyAdmin → datubāze trioitlv_trio_serv → SQL → ielīmē un Go

INSERT INTO users (id, email, password_hash, full_name, role, is_active)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'admin@trioit.lv',
  '$2a$12$npJ8/plzr5w6wegE1.gbx.bkehMlu8mr4MvGYPeLbfcHSWM1HD/ne',
  'Administrators',
  'admin',
  1
);

-- Pieslēgšanās: https://serv.trioit.lv
-- E-pasts:  admin@trioit.lv
-- Parole:   TrioServ2026!
-- Pēc pirmās pieslēgšanās nomaini paroli (kad būs UI — pagaidām phpMyAdmin).
