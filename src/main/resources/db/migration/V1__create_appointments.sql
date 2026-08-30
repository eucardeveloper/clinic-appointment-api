-- V1: Initial appointments table
CREATE TABLE appointment (
    id               BIGSERIAL PRIMARY KEY,
    patient_name     VARCHAR(100) NOT NULL,
    doctor_name      VARCHAR(100) NOT NULL,
    appointment_time TIMESTAMP    NOT NULL,
    department       VARCHAR(100) NOT NULL
);
