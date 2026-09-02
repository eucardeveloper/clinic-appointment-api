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
    /** Human-readable display name (e.g. "Ahmet Yılmaz") */
    private String patientName;
    /** Login username for patient-side filtering (e.g. "patient1") */
    private String patientUsername;
    private String doctorName;
    private LocalDateTime appointmentTime;
    private String department;
    private AppointmentStatus status;

    /**
     * The set of statuses this appointment can legally move to next.
     * Frontend uses this to enable/disable action buttons.
     */
    private Set<AppointmentStatus> allowedTransitions;
}
