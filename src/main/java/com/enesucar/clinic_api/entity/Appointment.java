package com.enesucar.clinic_api.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "appointment")
@Getter
@Setter
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Display name of the patient (e.g. "Ahmet Yılmaz") */
    private String patientName;

    /**
     * Login username of the patient (e.g. "patient1").
     * Used for role-scoped filtering in the service layer; never shown to other patients.
     */
    @Column(name = "patient_username")
    private String patientUsername;

    private String doctorName;

    private LocalDateTime appointmentTime;

    private String department;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AppointmentStatus status = AppointmentStatus.PENDING;
}
