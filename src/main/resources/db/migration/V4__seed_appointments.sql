-- V4: Realistic German seed data for development/demo
-- Multiple doctors, all status values represented, spread across time

INSERT INTO appointment (patient_name, doctor_name, appointment_time, department, status) VALUES

-- dr.weber (Cardiology / Neurology)
('Thomas Müller',      'dr.weber',   NOW() + INTERVAL '1 day'  + INTERVAL '9 hours',   'Cardiology',    'PENDING'),
('Anna Schmidt',       'dr.weber',   NOW() + INTERVAL '1 day'  + INTERVAL '10 hours',  'Cardiology',    'CONFIRMED'),
('Klaus Fischer',      'dr.weber',   NOW() + INTERVAL '2 days' + INTERVAL '11 hours',  'Neurology',     'PENDING'),
('Maria Wagner',       'dr.weber',   NOW() - INTERVAL '1 day'  + INTERVAL '9 hours',   'Cardiology',    'COMPLETED'),
('Hans Becker',        'dr.weber',   NOW() - INTERVAL '2 days' + INTERVAL '14 hours',  'Neurology',     'NO_SHOW'),
('Sabine Weber',       'dr.weber',   NOW() + INTERVAL '3 days' + INTERVAL '15 hours',  'Cardiology',    'PENDING'),
('Petra Hofmann',      'dr.weber',   NOW() - INTERVAL '3 days' + INTERVAL '10 hours',  'Cardiology',    'CANCELLED'),

-- dr.schmidt (Orthopedics / Dermatology)
('Jürgen Bauer',       'dr.schmidt', NOW() + INTERVAL '1 day'  + INTERVAL '8 hours',   'Orthopedics',   'CONFIRMED'),
('Helga Richter',      'dr.schmidt', NOW() + INTERVAL '1 day'  + INTERVAL '13 hours',  'Dermatology',   'PENDING'),
('Wolfgang Klein',     'dr.schmidt', NOW() + INTERVAL '2 days' + INTERVAL '9 hours',   'Orthopedics',   'PENDING'),
('Ingrid Wolf',        'dr.schmidt', NOW() - INTERVAL '1 day'  + INTERVAL '11 hours',  'Dermatology',   'COMPLETED'),
('Gerhard Schäfer',    'dr.schmidt', NOW() - INTERVAL '4 days' + INTERVAL '15 hours',  'Orthopedics',   'NO_SHOW'),
('Renate Braun',       'dr.schmidt', NOW() + INTERVAL '4 days' + INTERVAL '10 hours',  'Dermatology',   'PENDING'),

-- dr.mueller (Pediatrics / General)
('Lena Zimmermann',    'dr.mueller', NOW() + INTERVAL '1 day'  + INTERVAL '14 hours',  'Pediatrics',    'CONFIRMED'),
('Felix Krause',       'dr.mueller', NOW() + INTERVAL '2 days' + INTERVAL '16 hours',  'Pediatrics',    'PENDING'),
('Sophie Hartmann',    'dr.mueller', NOW() - INTERVAL '2 days' + INTERVAL '9 hours',   'General',       'COMPLETED'),
('Max Lange',          'dr.mueller', NOW() + INTERVAL '3 days' + INTERVAL '11 hours',  'General',       'PENDING'),
('Emma Schulz',        'dr.mueller', NOW() - INTERVAL '5 days' + INTERVAL '13 hours',  'Pediatrics',    'CANCELLED'),
('Leon Meyer',         'dr.mueller', NOW() + INTERVAL '5 days' + INTERVAL '8 hours',   'Pediatrics',    'PENDING');
