-- V8: Give the doctor table a real link to its login account.
--
-- Until now the frontend carried a hardcoded Record<username, doctorName> map to work out
-- "which appointments are mine". That is business logic living in the UI, it silently breaks
-- whenever a doctor is added, and it cannot be enforced server-side — so the backend had no
-- way to scope a doctor's data. This column moves the relationship into the database where
-- authorization can actually use it.

ALTER TABLE doctor ADD COLUMN username VARCHAR(100);

UPDATE doctor SET username = 'dr.wilson'   WHERE name = 'Dr. James Wilson';
UPDATE doctor SET username = 'dr.carter'   WHERE name = 'Dr. Emily Carter';
UPDATE doctor SET username = 'dr.cuddy'    WHERE name = 'Dr. Lisa Cuddy';
UPDATE doctor SET username = 'dr.park'     WHERE name = 'Dr. Michael Park';
UPDATE doctor SET username = 'dr.chen'     WHERE name = 'Dr. Sarah Chen';
UPDATE doctor SET username = 'dr.nguyen'   WHERE name = 'Dr. Tom Nguyen';
UPDATE doctor SET username = 'dr.webb'     WHERE name = 'Dr. Marcus Webb';
UPDATE doctor SET username = 'dr.kowalski' WHERE name = 'Dr. Anna Kowalski';

-- Legacy demo account from V3 — keep it working against a real doctor row.
INSERT INTO doctor (name, department_id, email, phone, active)
SELECT 'Dr. Weber', 1, 'weber@clinic.com', '+49 30 1234 5679', TRUE
WHERE NOT EXISTS (SELECT 1 FROM doctor WHERE name = 'Dr. Weber');
UPDATE doctor SET username = 'dr.weber' WHERE name = 'Dr. Weber';

CREATE UNIQUE INDEX idx_doctor_username ON doctor (username) WHERE username IS NOT NULL;

-- Patient appointments are matched on patient_name, so it must be indexed for the
-- role-scoped list query added in AppointmentService.getAllAppointments().
CREATE INDEX idx_appointment_patient_name ON appointment (patient_name);
CREATE INDEX idx_appointment_doctor_name  ON appointment (doctor_name);
