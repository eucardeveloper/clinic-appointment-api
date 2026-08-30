-- V7: Fix appointment seed data to match real doctor names and add missing departments
-- Previous seed (V4) used placeholder usernames (dr.weber, dr.schmidt, dr.mueller)
-- that do not correspond to actual doctor records in the doctor table

-- ─── 1. Add missing departments ─────────────────────────────────────────────
INSERT INTO department (name, floor, head_doctor) VALUES
    ('Dermatology',     2, 'Dr. Emily Carter'),
    ('General Medicine', 1, 'Dr. Tom Nguyen')
ON CONFLICT (name) DO NOTHING;

-- ─── 2. Fix dr.weber appointments ───────────────────────────────────────────
-- Cardiology → Dr. James Wilson
UPDATE appointment
SET doctor_name = 'Dr. James Wilson'
WHERE doctor_name = 'dr.weber' AND department = 'Cardiology';

-- Neurology → Dr. Lisa Cuddy
UPDATE appointment
SET doctor_name = 'Dr. Lisa Cuddy'
WHERE doctor_name = 'dr.weber' AND department = 'Neurology';

-- ─── 3. Fix dr.schmidt appointments ─────────────────────────────────────────
-- Orthopedics → Dr. Marcus Webb
UPDATE appointment
SET doctor_name = 'Dr. Marcus Webb'
WHERE doctor_name = 'dr.schmidt' AND department = 'Orthopedics';

-- Dermatology → Dr. Emily Carter
UPDATE appointment
SET doctor_name = 'Dr. Emily Carter'
WHERE doctor_name = 'dr.schmidt' AND department = 'Dermatology';

-- ─── 4. Fix dr.mueller appointments ─────────────────────────────────────────
-- Pediatrics → Dr. Sarah Chen
UPDATE appointment
SET doctor_name = 'Dr. Sarah Chen'
WHERE doctor_name = 'dr.mueller' AND department = 'Pediatrics';

-- General → Dr. Tom Nguyen  (also normalize department name)
UPDATE appointment
SET doctor_name = 'Dr. Tom Nguyen', department = 'General Medicine'
WHERE doctor_name = 'dr.mueller' AND department = 'General';

-- ─── 5. Add realistic app users for doctor and patient roles ────────────────
-- Passwords: doctor123 and patient123 (BCrypt $2a$10$ hashes)
-- Keep dr.weber for backward compat (existing login session), add new doctor users

INSERT INTO app_user (username, password, role) VALUES
    ('dr.wilson',   '$2a$10$Jk6xTtJRhgtPlGEXutAuzOcNx9w1BPvU4hpQPYW5mcd52zX4ocQHK', 'ROLE_DOCTOR'),
    ('dr.carter',   '$2a$10$Jk6xTtJRhgtPlGEXutAuzOcNx9w1BPvU4hpQPYW5mcd52zX4ocQHK', 'ROLE_DOCTOR'),
    ('dr.cuddy',    '$2a$10$Jk6xTtJRhgtPlGEXutAuzOcNx9w1BPvU4hpQPYW5mcd52zX4ocQHK', 'ROLE_DOCTOR'),
    ('dr.chen',     '$2a$10$Jk6xTtJRhgtPlGEXutAuzOcNx9w1BPvU4hpQPYW5mcd52zX4ocQHK', 'ROLE_DOCTOR'),
    ('dr.nguyen',   '$2a$10$Jk6xTtJRhgtPlGEXutAuzOcNx9w1BPvU4hpQPYW5mcd52zX4ocQHK', 'ROLE_DOCTOR'),
    ('dr.webb',     '$2a$10$Jk6xTtJRhgtPlGEXutAuzOcNx9w1BPvU4hpQPYW5mcd52zX4ocQHK', 'ROLE_DOCTOR'),
    ('dr.kowalski', '$2a$10$Jk6xTtJRhgtPlGEXutAuzOcNx9w1BPvU4hpQPYW5mcd52zX4ocQHK', 'ROLE_DOCTOR'),
    ('patient1',    '$2a$10$LE9LbCl.NMjvJn/hTfDMLeI14NLLZkqL0IuUCTgq7Oi44mzL0XLCC', 'ROLE_PATIENT'),
    ('patient2',    '$2a$10$LE9LbCl.NMjvJn/hTfDMLeI14NLLZkqL0IuUCTgq7Oi44mzL0XLCC', 'ROLE_PATIENT')
ON CONFLICT (username) DO NOTHING;

-- ─── 6. Re-map some seed appointment patient names to match login usernames ──
-- This lets patient1 and patient2 see their own appointments after login
UPDATE appointment SET patient_name = 'patient1'
WHERE patient_name IN ('Thomas Müller', 'Klaus Fischer', 'Sabine Weber',
                       'Lena Zimmermann', 'Felix Krause', 'Max Lange');

UPDATE appointment SET patient_name = 'patient2'
WHERE patient_name IN ('Anna Schmidt', 'Maria Wagner', 'Jürgen Bauer',
                       'Wolfgang Klein', 'Sophie Hartmann', 'Leon Meyer');
