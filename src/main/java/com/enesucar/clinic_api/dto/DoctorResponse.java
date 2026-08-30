package com.enesucar.clinic_api.dto;

public record DoctorResponse(
        Long id,
        String name,
        Long departmentId,
        String departmentName,
        String email,
        String phone,
        boolean active
) {}
