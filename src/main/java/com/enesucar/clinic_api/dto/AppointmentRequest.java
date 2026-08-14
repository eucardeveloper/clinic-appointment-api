package com.enesucar.clinic_api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter
@Setter
public class AppointmentRequest {

    @NotBlank(message = "Patient name must not be blank")
    private String patientName;

    @NotBlank(message = "Doctor name must not be blank")
    private String doctorName;

    @NotNull(message = "Appointment time must not be null")
    private LocalDateTime appointmentTime;

    @NotBlank(message = "Department must not be blank")
    private String department;

}
