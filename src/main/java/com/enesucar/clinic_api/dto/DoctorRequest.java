package com.enesucar.clinic_api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DoctorRequest(
        @NotBlank @Size(min = 2, max = 100) String name,
        Long departmentId,
        @NotBlank @Email String email,
        String phone
) {}
