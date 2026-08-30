-- V6: Create departments and doctors tables with seed data

CREATE TABLE department (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    floor       INTEGER,
    head_doctor VARCHAR(100)
);

CREATE TABLE doctor (
    id            BIGSERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    department_id BIGINT REFERENCES department(id) ON DELETE SET NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    phone         VARCHAR(30),
    active        BOOLEAN NOT NULL DEFAULT TRUE
);

-- Seed departments
INSERT INTO department (name, floor, head_doctor) VALUES
    ('Cardiology',       3, 'Dr. James Wilson'),
    ('Neurology',        4, 'Dr. Lisa Cuddy'),
    ('Pediatrics',       2, 'Dr. Sarah Chen'),
    ('Orthopedics',      5, 'Dr. Marcus Webb'),
    ('Emergency',        1, 'Dr. Anna Kowalski');

-- Seed doctors
INSERT INTO doctor (name, department_id, email, phone, active) VALUES
    ('Dr. James Wilson',  1, 'james.wilson@clinic.com',  '+49 30 1234 5671', TRUE),
    ('Dr. Emily Carter',  1, 'emily.carter@clinic.com',  '+49 30 1234 5672', TRUE),
    ('Dr. Lisa Cuddy',    2, 'lisa.cuddy@clinic.com',    '+49 30 1234 5673', TRUE),
    ('Dr. Michael Park',  2, 'michael.park@clinic.com',  '+49 30 1234 5674', FALSE),
    ('Dr. Sarah Chen',    3, 'sarah.chen@clinic.com',    '+49 30 1234 5675', TRUE),
    ('Dr. Tom Nguyen',    3, 'tom.nguyen@clinic.com',    '+49 30 1234 5676', TRUE),
    ('Dr. Marcus Webb',   4, 'marcus.webb@clinic.com',   '+49 30 1234 5677', TRUE),
    ('Dr. Anna Kowalski', 5, 'anna.kowalski@clinic.com', '+49 30 1234 5678', TRUE);
