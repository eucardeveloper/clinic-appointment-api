package com.enesucar.clinic_api.exception;

/** Thrown when an appointment refers to a doctor that does not exist. Results in HTTP 404. */
public class DoctorNotFoundException extends RuntimeException {

    public DoctorNotFoundException(String doctor) {
        super("Doctor not found: " + doctor);
    }
}
