-- V5: Fix BCrypt password hashes (regenerated with correct $2a$ prefix)
UPDATE app_user SET password = '$2a$10$SWjTrfnCJNM6xDIUJ.l.S./3p.Ov/Po14PvnrM2EGo2T0.eM0MIIG' WHERE username = 'admin';
UPDATE app_user SET password = '$2a$10$Jk6xTtJRhgtPlGEXutAuzOcNx9w1BPvU4hpQPYW5mcd52zX4ocQHK' WHERE username = 'dr.weber';
UPDATE app_user SET password = '$2a$10$LE9LbCl.NMjvJn/hTfDMLeI14NLLZkqL0IuUCTgq7Oi44mzL0XLCC' WHERE username = 'mueller';
