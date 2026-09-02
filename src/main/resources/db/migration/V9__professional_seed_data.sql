-- V9: Professional seed data with realistic German/Turkish names
-- Separates patient display name from login username
-- Adds patient_username column for role-scoped filtering

-- ─── 1. Add patient_username column to appointment ───────────────────────────
ALTER TABLE appointment ADD COLUMN IF NOT EXISTS patient_username VARCHAR(100);

-- ─── 2. Add display_name column to app_user ─────────────────────────────────
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS display_name VARCHAR(150);

-- ─── 3. Update existing user display names ───────────────────────────────────
UPDATE app_user SET display_name = 'System Administrator' WHERE username = 'admin';
UPDATE app_user SET display_name = 'Dr. James Wilson'    WHERE username = 'dr.wilson';
UPDATE app_user SET display_name = 'Dr. Emily Carter'    WHERE username = 'dr.carter';
UPDATE app_user SET display_name = 'Dr. Lisa Cuddy'      WHERE username = 'dr.cuddy';
UPDATE app_user SET display_name = 'Dr. Sarah Chen'      WHERE username = 'dr.chen';
UPDATE app_user SET display_name = 'Dr. Tom Nguyen'      WHERE username = 'dr.nguyen';
UPDATE app_user SET display_name = 'Dr. Marcus Webb'     WHERE username = 'dr.webb';
UPDATE app_user SET display_name = 'Dr. Anna Kowalski'   WHERE username = 'dr.kowalski';
UPDATE app_user SET display_name = 'Ahmet Yılmaz'        WHERE username = 'patient1';
UPDATE app_user SET display_name = 'Fatma Kaya'          WHERE username = 'patient2';
UPDATE app_user SET display_name = 'Dr. Weber'           WHERE username = 'dr.weber';
UPDATE app_user SET display_name = 'Müller'              WHERE username = 'mueller';

-- ─── 4. Delete all existing appointment test data ───────────────────────────
DELETE FROM appointment;

-- ─── 5. Reset appointment ID sequence ────────────────────────────────────────
ALTER SEQUENCE appointment_id_seq RESTART WITH 1;

-- ─── 6. Insert clean professional seed appointments ──────────────────────────
-- patient1 = Ahmet Yılmaz  (patient_username = 'patient1')
-- patient for dr.wilson / Dr. James Wilson (Cardiology)

INSERT INTO appointment (patient_name, patient_username, doctor_name, appointment_time, department, status) VALUES

-- ── Ahmet Yılmaz (patient1) — Dr. James Wilson (Cardiology) ─────────────────
('Ahmet Yılmaz',    'patient1', 'Dr. James Wilson',
  NOW() + INTERVAL '1 day'  + INTERVAL '9 hours',  'Cardiology',  'PENDING'),

('Ahmet Yılmaz',    'patient1', 'Dr. James Wilson',
  NOW() - INTERVAL '7 days' + INTERVAL '10 hours', 'Cardiology',  'COMPLETED'),

('Ahmet Yılmaz',    'patient1', 'Dr. Lisa Cuddy',
  NOW() + INTERVAL '3 days' + INTERVAL '14 hours', 'Neurology',   'CONFIRMED'),

-- ── Fatma Kaya (patient2) — Dr. Emily Carter (Cardiology) ───────────────────
('Fatma Kaya',      'patient2', 'Dr. Emily Carter',
  NOW() + INTERVAL '1 day'  + INTERVAL '11 hours', 'Cardiology',  'CONFIRMED'),

('Fatma Kaya',      'patient2', 'Dr. Sarah Chen',
  NOW() - INTERVAL '3 days' + INTERVAL '9 hours',  'Pediatrics',  'COMPLETED'),

('Fatma Kaya',      'patient2', 'Dr. Marcus Webb',
  NOW() + INTERVAL '5 days' + INTERVAL '13 hours', 'Orthopedics', 'PENDING'),

-- ── Other realistic patients — Dr. James Wilson (Cardiology) ─────────────────
('Thomas Müller',   NULL,       'Dr. James Wilson',
  NOW() + INTERVAL '2 days' + INTERVAL '8 hours',  'Cardiology',  'PENDING'),

('Klaus Fischer',   NULL,       'Dr. James Wilson',
  NOW() - INTERVAL '2 days' + INTERVAL '15 hours', 'Cardiology',  'NO_SHOW'),

('Maria Wagner',    NULL,       'Dr. James Wilson',
  NOW() + INTERVAL '4 days' + INTERVAL '9 hours',  'Cardiology',  'PENDING'),

-- ── Other realistic patients — Dr. Lisa Cuddy (Neurology) ───────────────────
('Hans Becker',     NULL,       'Dr. Lisa Cuddy',
  NOW() + INTERVAL '1 day'  + INTERVAL '10 hours', 'Neurology',   'CONFIRMED'),

('Erika Hoffmann',  NULL,       'Dr. Lisa Cuddy',
  NOW() - INTERVAL '5 days' + INTERVAL '14 hours', 'Neurology',   'COMPLETED'),

-- ── Other realistic patients — Dr. Sarah Chen (Pediatrics) ──────────────────
('Sophie Hartmann', NULL,       'Dr. Sarah Chen',
  NOW() + INTERVAL '2 days' + INTERVAL '11 hours', 'Pediatrics',  'PENDING'),

('Leon Meyer',      NULL,       'Dr. Sarah Chen',
  NOW() - INTERVAL '1 day'  + INTERVAL '13 hours', 'Pediatrics',  'CANCELLED'),

('Emma Schulz',     NULL,       'Dr. Sarah Chen',
  NOW() + INTERVAL '6 days' + INTERVAL '8 hours',  'Pediatrics',  'PENDING'),

-- ── Other realistic patients — Dr. Marcus Webb (Orthopedics) ────────────────
('Wolfgang Klein',  NULL,       'Dr. Marcus Webb',
  NOW() + INTERVAL '3 days' + INTERVAL '10 hours', 'Orthopedics', 'CONFIRMED'),

('Ingrid Wolf',     NULL,       'Dr. Marcus Webb',
  NOW() - INTERVAL '4 days' + INTERVAL '9 hours',  'Orthopedics', 'NO_SHOW'),

-- ── Other realistic patients — Dr. Emily Carter (Cardiology) ────────────────
('Jürgen Bauer',    NULL,       'Dr. Emily Carter',
  NOW() + INTERVAL '1 day'  + INTERVAL '16 hours', 'Cardiology',  'PENDING'),

('Sabine Weber',    NULL,       'Dr. Emily Carter',
  NOW() - INTERVAL '6 days' + INTERVAL '11 hours', 'Cardiology',  'COMPLETED'),

-- ── Other realistic patients — Dr. Anna Kowalski (Emergency) ────────────────
('Renate Braun',    NULL,       'Dr. Anna Kowalski',
  NOW() + INTERVAL '0 days' + INTERVAL '12 hours', 'Emergency',   'CONFIRMED'),

('Gerhard Schäfer', NULL,       'Dr. Anna Kowalski',
  NOW() + INTERVAL '2 days' + INTERVAL '7 hours',  'Emergency',   'PENDING');

-- ─── 7. Indexes for the new column ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_appointment_patient_username ON appointment (patient_username);
