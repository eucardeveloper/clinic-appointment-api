-- V2: Add appointment status (state machine)
ALTER TABLE appointment
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'PENDING';
