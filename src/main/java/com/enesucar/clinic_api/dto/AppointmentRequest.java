package com.enesucar.clinic_api.dto;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class AppointmentRequest {

    @NotBlank(message = "Patient name must not be blank")
    @Size(min = 2, max = 100, message = "Patient name must be between 2 and 100 characters")
    private String patientName;

    /**
     * Login username of the patient — required so the system can scope
     * the appointment to that patient's dashboard.
     */
    @Size(max = 100)
    private String patientUsername;

    @NotBlank(message = "Doctor name must not be blank")
    @Size(min = 2, max = 100, message = "Doctor name must be between 2 and 100 characters")
    private String doctorName;

    @NotNull(message = "Appointment time must not be null")
    @Future(message = "Appointment time must be in the future")
    private LocalDateTime appointmentTime;

    @NotBlank(message = "Department must not be blank")
    @Size(min = 2, max = 100, message = "Department must be between 2 and 100 characters")
    private String department;
}
