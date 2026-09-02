package com.enesucar.clinic_api.dto;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateUserRequest {

    @NotBlank
    @Size(min = 3, max = 50)
    private String username;

    @NotBlank
    @Size(min = 6, max = 100)
    private String password;

    /** "ROLE_DOCTOR" or "ROLE_PATIENT" — admin cannot create another admin via this endpoint */
    @NotBlank
    @Pattern(regexp = "ROLE_DOCTOR|ROLE_PATIENT", message = "Role must be ROLE_DOCTOR or ROLE_PATIENT")
    private String role;

    /** Human-readable full name (e.g. "Dr. Ahmet Yılmaz", "Maria Wagner") */
    @NotBlank
    @Size(min = 2, max = 150)
    private String displayName;
}
