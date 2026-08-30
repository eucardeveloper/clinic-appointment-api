-- V3: Application users (DSGVO Art.9 — personal data, access must be logged in production)
CREATE TABLE app_user (
    id       BIGSERIAL    PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role     VARCHAR(50)  NOT NULL
);

-- Seed users (passwords are BCrypt hashes)
-- admin123   → ROLE_ADMIN
-- doctor123  → ROLE_DOCTOR
-- patient123 → ROLE_PATIENT
INSERT INTO app_user (username, password, role) VALUES
    ('admin',   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'ROLE_ADMIN'),
    ('dr.weber', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.aKB1Hom', 'ROLE_DOCTOR'),
    ('mueller',  '$2a$10$TwO.VrMk.tC3f6JHLlAtueHFb7Dl/FUxFPIq8r0LwVNV5IrA.ASWK', 'ROLE_PATIENT');
