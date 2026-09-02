package com.enesucar.clinic_api.repository;

import com.enesucar.clinic_api.entity.Appointment;
import com.enesucar.clinic_api.entity.AppointmentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
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
     * A patient's own appointments, scoped by their login username stored in patient_username.
     * patient_name holds the display name; patient_username is the auth identity.
     * Backed by idx_appointment_patient_username (V9).
     */
    List<Appointment> findByPatientUsername(String patientUsername);

    /**
     * @deprecated Use findByPatientUsername for role-scoped queries.
     * Kept for backward compatibility with pre-V9 data where patient_username may be null.
     */
    @Deprecated
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

    /**
     * Bulk-renames doctor name on all appointments when a doctor's name is changed.
     * Called from DoctorService.update() to keep appointment records in sync.
     */
    @Modifying
    @Query("UPDATE Appointment a SET a.doctorName = :newName WHERE a.doctorName = :oldName")
    int updateDoctorName(@Param("oldName") String oldName, @Param("newName") String newName);
}
