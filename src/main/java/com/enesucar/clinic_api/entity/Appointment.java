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

    /** Display name, kept in sync with doctor.name. The doctor_id column is the identity. */
    private String doctorName;

    /**
     * The doctor this appointment belongs to. Conflict checks, row locking and the
     * ex_appointment_doctor_no_overlap exclusion constraint all use this id, never the name.
     */
    @Column(name = "doctor_id")
    private Long doctorId;

    private LocalDateTime appointmentTime;

    private String department;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AppointmentStatus status = AppointmentStatus.PENDING;
}
