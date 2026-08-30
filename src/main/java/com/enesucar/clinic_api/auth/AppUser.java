package com.enesucar.clinic_api.auth;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * Application user — stores credentials and role.
 * Passwords are BCrypt-hashed (never stored in plaintext).
 * DSGVO note: this table contains personal data (username/email).
 */
@Entity
@Table(name = "app_user")
@Getter
@Setter
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    /** Stored as "ROLE_ADMIN", "ROLE_DOCTOR", "ROLE_PATIENT" */
    @Column(nullable = false)
    private String role;
}
