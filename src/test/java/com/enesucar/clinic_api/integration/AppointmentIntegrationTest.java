package com.enesucar.clinic_api.integration;

import com.enesucar.clinic_api.entity.Appointment;
import com.enesucar.clinic_api.entity.AppointmentStatus;
import com.enesucar.clinic_api.repository.AppointmentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration test using a real PostgreSQL container via Testcontainers.
 * No mocks — tests actual SQL queries and JPA behavior.
 *
 * Why Testcontainers instead of H2?
 * H2 in PostgreSQL MODE doesn't support all PostgreSQL features.
 * Testcontainers spins up the exact same postgres:16-alpine image used in production.
 */
@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class AppointmentIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres =
            new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    AppointmentRepository repository;

    private static final String DOCTOR = "dr.weber";
    private static final LocalDateTime BASE_TIME =
            LocalDateTime.now().plusDays(1).withHour(10).withMinute(0).withSecond(0).withNano(0);

    @BeforeEach
    void setUp() {
        repository.deleteAll();
    }

    @Test
    void savesAndRetrievesAppointment() {
        Appointment a = appointment("Thomas Müller", DOCTOR, BASE_TIME);
        repository.save(a);

        assertThat(repository.findAll()).hasSize(1);
        assertThat(repository.findAll().get(0).getPatientName()).isEqualTo("Thomas Müller");
    }

    @Test
    void findConflicting_detectsOverlap() {
        // Book 10:00
        repository.save(appointment("Patient A", DOCTOR, BASE_TIME));

        // Check 10:15 — within 30-min window → should conflict
        LocalDateTime overlap = BASE_TIME.plusMinutes(15);
        List<Appointment> conflicts = repository.findConflicting(
                DOCTOR, -1L,
                List.of(AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW),
                overlap.minusMinutes(30),
                overlap.plusMinutes(30)
        );

        assertThat(conflicts).hasSize(1);
    }

    @Test
    void findConflicting_ignoresCancelledAppointments() {
        // Book 10:00 but cancel it
        Appointment cancelled = appointment("Patient A", DOCTOR, BASE_TIME);
        cancelled.setStatus(AppointmentStatus.CANCELLED);
        repository.save(cancelled);

        // Same slot should now be free
        List<Appointment> conflicts = repository.findConflicting(
                DOCTOR, -1L,
                List.of(AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW),
                BASE_TIME.minusMinutes(30),
                BASE_TIME.plusMinutes(30)
        );

        assertThat(conflicts).isEmpty();
    }

    @Test
    void findConflicting_excludesSameAppointmentOnUpdate() {
        Appointment saved = repository.save(appointment("Patient A", DOCTOR, BASE_TIME));

        // Updating same appointment — should not conflict with itself
        List<Appointment> conflicts = repository.findConflicting(
                DOCTOR, saved.getId(),
                List.of(AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW),
                BASE_TIME.minusMinutes(30),
                BASE_TIME.plusMinutes(30)
        );

        assertThat(conflicts).isEmpty();
    }

    @Test
    void findBookedSlots_returnsOnlyActiveAppointments() {
        repository.save(appointment("Patient A", DOCTOR, BASE_TIME));

        Appointment cancelled = appointment("Patient B", DOCTOR, BASE_TIME.plusMinutes(30));
        cancelled.setStatus(AppointmentStatus.CANCELLED);
        repository.save(cancelled);

        List<LocalDateTime> booked = repository.findBookedSlots(
                DOCTOR,
                List.of(AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW),
                BASE_TIME.minusMinutes(1)
        );

        // Only the PENDING one at BASE_TIME — cancelled is excluded
        assertThat(booked).containsExactly(BASE_TIME);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private Appointment appointment(String patient, String doctor, LocalDateTime time) {
        Appointment a = new Appointment();
        a.setPatientName(patient);
        a.setDoctorName(doctor);
        a.setAppointmentTime(time);
        a.setDepartment("General");
        a.setStatus(AppointmentStatus.PENDING);
        return a;
    }
}
