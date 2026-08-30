package com.enesucar.clinic_api.dto;

public record DepartmentResponse(
        Long id,
        String name,
        Integer floor,
        String headDoctor,
        long activeDoctors
) {}
