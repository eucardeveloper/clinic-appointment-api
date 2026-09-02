-- V11: Rename patient usernames from patient1/2/3/4/5 to real names.
-- Makes it obvious which account belongs to which person.
-- Passwords remain: patient123

-- ─── 1. Rename usernames in app_user ─────────────────────────────────────────
UPDATE app_user SET username = 'ahmet.yilmaz'   WHERE username = 'patient1';
UPDATE app_user SET username = 'fatma.kaya'      WHERE username = 'patient2';
UPDATE app_user SET username = 'mehmet.demir'    WHERE username = 'patient3';
UPDATE app_user SET username = 'zeynep.celik'    WHERE username = 'patient4';
UPDATE app_user SET username = 'thomas.mueller'  WHERE username = 'patient5';

-- ─── 2. Update appointment.patient_username to match new usernames ────────────
UPDATE appointment SET patient_username = 'ahmet.yilmaz'  WHERE patient_username = 'patient1';
UPDATE appointment SET patient_username = 'fatma.kaya'     WHERE patient_username = 'patient2';
UPDATE appointment SET patient_username = 'mehmet.demir'   WHERE patient_username = 'patient3';
UPDATE appointment SET patient_username = 'zeynep.celik'   WHERE patient_username = 'patient4';
UPDATE appointment SET patient_username = 'thomas.mueller' WHERE patient_username = 'patient5';
