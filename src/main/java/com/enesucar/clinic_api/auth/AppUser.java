package com.enesucar.clinic_api.auth;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * Application user — stores credentials, role and display name.
 * Passwords are BCrypt-hashed (never stored in plaintext).
 * DSGVO note: this table contains personal data.
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

    /**
     * Human-readable full name (e.g. "Dr. James Wilson", "Ahmet Yılmaz").
     * Set by V9 migration; null for legacy accounts without a display name.
     */
    @Column(name = "display_name")
    private String displayName;
}
