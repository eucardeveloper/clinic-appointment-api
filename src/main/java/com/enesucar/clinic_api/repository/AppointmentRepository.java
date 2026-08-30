package com.enesucar.clinic_api.repository;

import com.enesucar.clinic_api.entity.Appointment;
import com.enesucar.clinic_api.entity.AppointmentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    /**
     * Finds overlapping appointments for the same doctor within a ±30 minute window.
     * Excludes CANCELLED and NO_SHOW — those slots are free again.
     * excludeId allows updates to skip the appointment being modified.
     */
    @Query("""
            SELECT a FROM Appointment a
            WHERE a.doctorName = :doctorName
              AND a.id <> :excludeId
              AND a.status NOT IN :ignoredStatuses
              AND a.appointmentTime BETWEEN :from AND :to
            """)
    List<Appointment> findConflicting(
            @Param("doctorName") String doctorName,
            @Param("excludeId") Long excludeId,
            @Param("ignoredStatuses") List<AppointmentStatus> ignoredStatuses,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to
    );

    /**
     * Finds all booked (non-cancelled) appointment times for a doctor after a given time.
     * Used to compute alternative free slots when a conflict is detected.
     */
    @Query("""
            SELECT a.appointmentTime FROM Appointment a
            WHERE a.doctorName = :doctorName
              AND a.status NOT IN :ignoredStatuses
              AND a.appointmentTime >= :after
            ORDER BY a.appointmentTime ASC
            """)
    List<LocalDateTime> findBookedSlots(
            @Param("doctorName") String doctorName,
            @Param("ignoredStatuses") List<AppointmentStatus> ignoredStatuses,
            @Param("after") LocalDateTime after
    );

    /**
     * Filtered + paginated appointment list.
     * All parameters are optional — null values are ignored in the WHERE clause.
     */
    @Query("""
            SELECT a FROM Appointment a
            WHERE (:status IS NULL OR a.status = :status)
              AND (:doctorName IS NULL OR LOWER(a.doctorName) LIKE LOWER(CONCAT('%', :doctorName, '%')))
              AND (:from IS NULL OR a.appointmentTime >= :from)
              AND (:to IS NULL OR a.appointmentTime <= :to)
            """)
    Page<Appointment> findFiltered(
            @Param("status") AppointmentStatus status,
            @Param("doctorName") String doctorName,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            Pageable pageable
    );

    /**
     * A patient's own appointments. Matched on patient_name because Appointment has no FK to
     * AppUser in this schema; the seed data and the booking form both write the username here.
     * Backed by idx_appointment_patient_name (V8).
     */
    List<Appointment> findByPatientName(String patientName);

    /**
     * The appointments belonging to the doctor who owns the given login account.
     *
     * <p>Appointment stores doctor_name as free text rather than a FK, so this resolves the
     * name through the doctor table's username column (added in V8). Doing the mapping here
     * replaces the hardcoded username→doctorName map that used to live in the frontend, and
     * means the scoping can actually be enforced on the server.
     */
    @Query("""
            SELECT a FROM Appointment a
            WHERE a.doctorName = (SELECT d.name FROM Doctor d WHERE d.username = :username)
            """)
    List<Appointment> findByDoctorUsername(@Param("username") String username);
}
