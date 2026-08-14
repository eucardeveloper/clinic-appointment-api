package com.enesucar.clinic_api.dto;

import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter
@Setter
public class AppointmentResponse {

    private Long id;
    private String patientName;
    private String doctorName;
    private LocalDateTime appointmentTime;
    private String department;
}
