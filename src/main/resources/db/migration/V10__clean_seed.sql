-- V10: Full clean seed with ON CONFLICT DO NOTHING — safe to re-run
-- Passwords: admin → admin123 | doctors → doctor123 | patients → patient123

-- ─── 1. Departments ──────────────────────────────────────────────────────────
INSERT INTO department (name, floor, head_doctor) VALUES
    ('Cardiology',      3, 'Dr. James Wilson'),
    ('Neurology',       4, 'Dr. Lisa Cuddy'),
    ('Pediatrics',      2, 'Dr. Sarah Chen'),
    ('Orthopedics',     5, 'Dr. Marcus Webb'),
    ('Emergency',       1, 'Dr. Anna Kowalski'),
    ('Dermatology',     2, 'Dr. Emily Carter'),
    ('General Medicine',1, 'Dr. Tom Nguyen')
ON CONFLICT (name) DO NOTHING;

-- ─── 2. App users ─────────────────────────────────────────────────────────────
INSERT INTO app_user (username, password, role, display_name) VALUES
    ('admin',       '$2a$10$SWjTrfnCJNM6xDIUJ.l.S./3p.Ov/Po14PvnrM2EGo2T0.eM0MIIG',
                    'ROLE_ADMIN',   'System Administrator'),
    ('dr.wilson',   '$2a$10$Jk6xTtJRhgtPlGEXutAuzOcNx9w1BPvU4hpQPYW5mcd52zX4ocQHK',
                    'ROLE_DOCTOR',  'Dr. James Wilson'),
    ('dr.carter',   '$2a$10$Jk6xTtJRhgtPlGEXutAuzOcNx9w1BPvU4hpQPYW5mcd52zX4ocQHK',
                    'ROLE_DOCTOR',  'Dr. Emily Carter'),
    ('dr.cuddy',    '$2a$10$Jk6xTtJRhgtPlGEXutAuzOcNx9w1BPvU4hpQPYW5mcd52zX4ocQHK',
                    'ROLE_DOCTOR',  'Dr. Lisa Cuddy'),
    ('dr.chen',     '$2a$10$Jk6xTtJRhgtPlGEXutAuzOcNx9w1BPvU4hpQPYW5mcd52zX4ocQHK',
                    'ROLE_DOCTOR',  'Dr. Sarah Chen'),
    ('dr.nguyen',   '$2a$10$Jk6xTtJRhgtPlGEXutAuzOcNx9w1BPvU4hpQPYW5mcd52zX4ocQHK',
                    'ROLE_DOCTOR',  'Dr. Tom Nguyen'),
    ('dr.webb',     '$2a$10$Jk6xTtJRhgtPlGEXutAuzOcNx9w1BPvU4hpQPYW5mcd52zX4ocQHK',
                    'ROLE_DOCTOR',  'Dr. Marcus Webb'),
    ('dr.kowalski', '$2a$10$Jk6xTtJRhgtPlGEXutAuzOcNx9w1BPvU4hpQPYW5mcd52zX4ocQHK',
                    'ROLE_DOCTOR',  'Dr. Anna Kowalski'),
    ('patient1',    '$2a$10$LE9LbCl.NMjvJn/hTfDMLeI14NLLZkqL0IuUCTgq7Oi44mzL0XLCC',
                    'ROLE_PATIENT', 'Ahmet Yılmaz'),
    ('patient2',    '$2a$10$LE9LbCl.NMjvJn/hTfDMLeI14NLLZkqL0IuUCTgq7Oi44mzL0XLCC',
                    'ROLE_PATIENT', 'Fatma Kaya'),
    ('patient3',    '$2a$10$LE9LbCl.NMjvJn/hTfDMLeI14NLLZkqL0IuUCTgq7Oi44mzL0XLCC',
                    'ROLE_PATIENT', 'Mehmet Demir'),
    ('patient4',    '$2a$10$LE9LbCl.NMjvJn/hTfDMLeI14NLLZkqL0IuUCTgq7Oi44mzL0XLCC',
                    'ROLE_PATIENT', 'Zeynep Çelik'),
    ('patient5',    '$2a$10$LE9LbCl.NMjvJn/hTfDMLeI14NLLZkqL0IuUCTgq7Oi44mzL0XLCC',
                    'ROLE_PATIENT', 'Thomas Müller')
ON CONFLICT (username) DO NOTHING;

-- ─── 3. Doctor records ────────────────────────────────────────────────────────
INSERT INTO doctor (name, department_id, email, phone, active, username)
SELECT 'Dr. James Wilson',  d.id, 'james.wilson@clinic.de',  '+49 30 1234 5671', TRUE, 'dr.wilson'
  FROM department d WHERE d.name = 'Cardiology'
ON CONFLICT DO NOTHING;

INSERT INTO doctor (name, department_id, email, phone, active, username)
SELECT 'Dr. Emily Carter',  d.id, 'emily.carter@clinic.de',  '+49 30 1234 5672', TRUE, 'dr.carter'
  FROM department d WHERE d.name = 'Dermatology'
ON CONFLICT DO NOTHING;

INSERT INTO doctor (name, department_id, email, phone, active, username)
SELECT 'Dr. Lisa Cuddy',    d.id, 'lisa.cuddy@clinic.de',    '+49 30 1234 5673', TRUE, 'dr.cuddy'
  FROM department d WHERE d.name = 'Neurology'
ON CONFLICT DO NOTHING;

INSERT INTO doctor (name, department_id, email, phone, active, username)
SELECT 'Dr. Sarah Chen',    d.id, 'sarah.chen@clinic.de',    '+49 30 1234 5675', TRUE, 'dr.chen'
  FROM department d WHERE d.name = 'Pediatrics'
ON CONFLICT DO NOTHING;

INSERT INTO doctor (name, department_id, email, phone, active, username)
SELECT 'Dr. Tom Nguyen',    d.id, 'tom.nguyen@clinic.de',    '+49 30 1234 5676', TRUE, 'dr.nguyen'
  FROM department d WHERE d.name = 'General Medicine'
ON CONFLICT DO NOTHING;

INSERT INTO doctor (name, department_id, email, phone, active, username)
SELECT 'Dr. Marcus Webb',   d.id, 'marcus.webb@clinic.de',   '+49 30 1234 5677', TRUE, 'dr.webb'
  FROM department d WHERE d.name = 'Orthopedics'
ON CONFLICT DO NOTHING;

INSERT INTO doctor (name, department_id, email, phone, active, username)
SELECT 'Dr. Anna Kowalski', d.id, 'anna.kowalski@clinic.de', '+49 30 1234 5678', TRUE, 'dr.kowalski'
  FROM department d WHERE d.name = 'Emergency'
ON CONFLICT DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS idx_doctor_username ON doctor (username) WHERE username IS NOT NULL;

-- ─── 4. Appointments ─────────────────────────────────────────────────────────
INSERT INTO appointment (patient_name, patient_username, doctor_name, appointment_time, department, status) VALUES
('Ahmet Yılmaz',    'patient1', 'Dr. James Wilson',  NOW() + INTERVAL '1 day'  + INTERVAL '9 hours',   'Cardiology',       'PENDING'),
('Ahmet Yılmaz',    'patient1', 'Dr. James Wilson',  NOW() - INTERVAL '6 days' + INTERVAL '10 hours',  'Cardiology',       'COMPLETED'),
('Thomas Müller',   'patient5', 'Dr. James Wilson',  NOW() + INTERVAL '3 days' + INTERVAL '8 hours',   'Cardiology',       'CONFIRMED'),
('Klaus Fischer',   NULL,       'Dr. James Wilson',  NOW() - INTERVAL '2 days' + INTERVAL '15 hours',  'Cardiology',       'NO_SHOW'),
('Fatma Kaya',      'patient2', 'Dr. Emily Carter',  NOW() + INTERVAL '2 days' + INTERVAL '11 hours',  'Dermatology',      'PENDING'),
('Zeynep Çelik',    'patient4', 'Dr. Emily Carter',  NOW() + INTERVAL '5 days' + INTERVAL '14 hours',  'Dermatology',      'CONFIRMED'),
('Erika Hoffmann',  NULL,       'Dr. Emily Carter',  NOW() - INTERVAL '4 days' + INTERVAL '10 hours',  'Dermatology',      'COMPLETED'),
('Ahmet Yılmaz',    'patient1', 'Dr. Lisa Cuddy',    NOW() + INTERVAL '4 days' + INTERVAL '13 hours',  'Neurology',        'CONFIRMED'),
('Hans Becker',     NULL,       'Dr. Lisa Cuddy',    NOW() + INTERVAL '1 day'  + INTERVAL '10 hours',  'Neurology',        'PENDING'),
('Ingrid Wolf',     NULL,       'Dr. Lisa Cuddy',    NOW() - INTERVAL '5 days' + INTERVAL '9 hours',   'Neurology',        'COMPLETED'),
('Fatma Kaya',      'patient2', 'Dr. Sarah Chen',    NOW() + INTERVAL '2 days' + INTERVAL '11 hours',  'Pediatrics',       'PENDING'),
('Emma Schmidt',    NULL,       'Dr. Sarah Chen',    NOW() + INTERVAL '6 days' + INTERVAL '8 hours',   'Pediatrics',       'CONFIRMED'),
('Leon Meyer',      NULL,       'Dr. Sarah Chen',    NOW() - INTERVAL '1 day'  + INTERVAL '13 hours',  'Pediatrics',       'CANCELLED'),
('Mehmet Demir',    'patient3', 'Dr. Tom Nguyen',    NOW() + INTERVAL '1 day'  + INTERVAL '14 hours',  'General Medicine', 'PENDING'),
('Zeynep Çelik',    'patient4', 'Dr. Tom Nguyen',    NOW() - INTERVAL '3 days' + INTERVAL '16 hours',  'General Medicine', 'COMPLETED'),
('Wolfgang Klein',  NULL,       'Dr. Tom Nguyen',    NOW() + INTERVAL '7 days' + INTERVAL '9 hours',   'General Medicine', 'PENDING'),
('Mehmet Demir',    'patient3', 'Dr. Marcus Webb',   NOW() + INTERVAL '3 days' + INTERVAL '10 hours',  'Orthopedics',      'CONFIRMED'),
('Thomas Müller',   'patient5', 'Dr. Marcus Webb',   NOW() - INTERVAL '7 days' + INTERVAL '11 hours',  'Orthopedics',      'COMPLETED'),
('Sabine Richter',  NULL,       'Dr. Marcus Webb',   NOW() + INTERVAL '4 days' + INTERVAL '15 hours',  'Orthopedics',      'PENDING'),
('Zeynep Çelik',    'patient4', 'Dr. Anna Kowalski', NOW() + INTERVAL '0 days' + INTERVAL '2 hours',   'Emergency',        'CONFIRMED'),
('Thomas Müller',   'patient5', 'Dr. Anna Kowalski', NOW() + INTERVAL '1 day'  + INTERVAL '7 hours',   'Emergency',        'PENDING'),
('Gerhard Schäfer', NULL,       'Dr. Anna Kowalski', NOW() - INTERVAL '9 days' + INTERVAL '8 hours',   'Emergency',        'COMPLETED');

CREATE INDEX IF NOT EXISTS idx_appointment_patient_name     ON appointment (patient_name);
CREATE INDEX IF NOT EXISTS idx_appointment_doctor_name      ON appointment (doctor_name);
CREATE INDEX IF NOT EXISTS idx_appointment_patient_username ON appointment (patient_username);
