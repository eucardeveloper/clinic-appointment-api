-- V12: Make double booking impossible at the database level.
--
-- Before: the overlap check was "SELECT conflicts, then INSERT" keyed by the doctor's NAME.
-- Two concurrent requests could both pass the check and both insert, and a renamed or
-- duplicated doctor name silently broke the check. The application lock (see
-- AppointmentService) gives clean 409 responses, but only a constraint is a guarantee.
--
-- After:
--   * appointment.doctor_id references doctor(id); doctor_name stays as a denormalised display name.
--   * An exclusion constraint forbids two ACTIVE appointments of the same doctor whose
--     30-minute slots [start, start + 30 min) overlap. Slots that merely touch (10:00 and
--     10:30) are allowed. CANCELLED and NO_SHOW appointments free their slot again.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE appointment ADD COLUMN doctor_id BIGINT REFERENCES doctor(id);

-- Backfill from the name. If a name is duplicated, the oldest doctor row wins.
UPDATE appointment a
SET    doctor_id = (SELECT MIN(d.id) FROM doctor d WHERE LOWER(d.name) = LOWER(a.doctor_name))
WHERE  a.doctor_id IS NULL;

-- Existing data may already contain overlapping active appointments for the same doctor
-- (the demo seed does). The constraint cannot be created on top of them, so the later
-- appointment (higher id) of each overlapping pair is cancelled. Nothing is deleted.
DO $$
DECLARE
    cancelled_count INTEGER := 0;
    n               INTEGER;
BEGIN
    LOOP
        UPDATE appointment b
        SET    status = 'CANCELLED'
        WHERE  b.doctor_id IS NOT NULL
          AND  b.status NOT IN ('CANCELLED', 'NO_SHOW')
          AND  EXISTS (
                   SELECT 1
                   FROM   appointment a
                   WHERE  a.doctor_id = b.doctor_id
                     AND  a.id < b.id
                     AND  a.status NOT IN ('CANCELLED', 'NO_SHOW')
                     AND  tsrange(a.appointment_time, a.appointment_time + INTERVAL '30 minutes')
                          && tsrange(b.appointment_time, b.appointment_time + INTERVAL '30 minutes')
               );
        GET DIAGNOSTICS n = ROW_COUNT;
        EXIT WHEN n = 0;
        cancelled_count := cancelled_count + n;
    END LOOP;
    IF cancelled_count > 0 THEN
        RAISE NOTICE 'V12: cancelled % overlapping appointment(s) so the exclusion constraint can be created', cancelled_count;
    END IF;
END $$;

ALTER TABLE appointment
    ADD CONSTRAINT ex_appointment_doctor_no_overlap
    EXCLUDE USING gist (
        doctor_id WITH =,
        tsrange(appointment_time, appointment_time + INTERVAL '30 minutes') WITH &&
    )
    WHERE (doctor_id IS NOT NULL AND status NOT IN ('CANCELLED', 'NO_SHOW'));

CREATE INDEX idx_appointment_doctor_id_time ON appointment (doctor_id, appointment_time);
