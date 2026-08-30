package com.enesucar.clinic_api.dto;

import com.enesucar.clinic_api.entity.AppointmentStatus;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.Set;

@Getter
@Setter
public class AppointmentResponse {

    private Long id;
    private String patientName;
    private String doctorName;
    private LocalDateTime appointmentTime;
    private String department;
    private AppointmentStatus status;

    /**
     * The set of statuses this appointment can legally move to next.
     * Frontend uses this to enable/disable action buttons — no hardcoding on the UI side.
     */
    private Set<AppointmentStatus> allowedTransitions;
}
