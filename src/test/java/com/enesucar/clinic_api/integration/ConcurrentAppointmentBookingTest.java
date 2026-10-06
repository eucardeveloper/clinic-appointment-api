package com.enesucar.clinic_api.integration;

import com.enesucar.clinic_api.dto.AppointmentRequest;
import com.enesucar.clinic_api.dto.AppointmentResponse;
import com.enesucar.clinic_api.entity.Doctor;
import com.enesucar.clinic_api.exception.AppointmentConflictException;
import com.enesucar.clinic_api.repository.DoctorRepository;
import com.enesucar.clinic_api.service.AppointmentService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.function.IntFunction;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Proves that a doctor can never be double booked, against a real PostgreSQL 16 with the
 * real Flyway migrations (including the V12 exclusion constraint).
 *
 * The earlier integration test only checked the conflict QUERY. That would still pass if two
 * concurrent requests both ran the query, both saw "no conflict", and both inserted. These
 * tests fire the requests at the same instant from many threads.
 */
@SpringBootTest
@Testcontainers(disabledWithoutDocker = true)
@DisplayName("Concurrent appointment booking (PostgreSQL)")
class ConcurrentAppointmentBookingTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    AppointmentService appointmentService;

    @Autowired
    DoctorRepository doctorRepository;

    @Autowired
    JdbcTemplate jdbc;

    private static final LocalDateTime SLOT =
            LocalDateTime.now().plusDays(3).withHour(10).withMinute(0).withSecond(0).withNano(0);

    private Long doctorId;

    @BeforeEach
    void createDoctor() {
        long unique = System.nanoTime();
        Doctor doctor = new Doctor();
        doctor.setName("Dr. Race " + unique);
        doctor.setEmail("race-" + unique + "@clinic.test");
        doctorId = doctorRepository.save(doctor).getId();
    }

    @AfterEach
    void cleanUp() {
        jdbc.update("DELETE FROM appointment WHERE doctor_id = ?", doctorId);
        doctorRepository.deleteById(doctorId);
    }

    @Test
    @DisplayName("12 threads book the same slot: exactly one succeeds, the rest get a conflict")
    void sameSlot_exactlyOneBooking() throws Exception {
        List<Object> results = runConcurrently(12, i -> request("Patient " + i, SLOT));

        assertThat(successes(results)).hasSize(1);
        assertThat(failures(results))
                .hasSize(11)
                .allSatisfy(e -> assertThat(e).isInstanceOf(AppointmentConflictException.class));
        assertThat(activeAppointments()).isEqualTo(1);
    }

    @Test
    @DisplayName("overlapping (not identical) slots raced concurrently: still exactly one booking")
    void overlappingSlots_exactlyOneBooking() throws Exception {
        // 10:00 and 10:15 overlap each other, so only one of the 10 requests may win
        List<Object> results = runConcurrently(10,
                i -> request("Patient " + i, SLOT.plusMinutes(i % 2 == 0 ? 0 : 15)));

        assertThat(successes(results)).hasSize(1);
        assertThat(activeAppointments()).isEqualTo(1);
    }

    @Test
    @DisplayName("slots that only touch (10:00 and 10:30) are both allowed")
    void adjacentSlots_bothBooked() {
        appointmentService.saveAppointment(request("Patient A", SLOT));
        appointmentService.saveAppointment(request("Patient B", SLOT.plusMinutes(30)));

        assertThat(activeAppointments()).isEqualTo(2);
    }

    @Test
    @DisplayName("a cancelled appointment frees its slot")
    void cancelledAppointment_freesSlot() {
        AppointmentResponse first = appointmentService.saveAppointment(request("Patient A", SLOT));
        jdbc.update("UPDATE appointment SET status = 'CANCELLED' WHERE id = ?", first.getId());

        appointmentService.saveAppointment(request("Patient B", SLOT));

        assertThat(activeAppointments()).isEqualTo(1);
    }

    @Test
    @DisplayName("the database itself rejects an overlap, even when the application lock is bypassed")
    void database_rejectsOverlap_withoutApplicationLock() {
        String insert = "INSERT INTO appointment "
                + "(patient_name, doctor_name, doctor_id, appointment_time, department, status) "
                + "VALUES (?, 'Dr. Race', ?, ?, 'General', 'PENDING')";
        jdbc.update(insert, "Patient A", doctorId, SLOT);

        assertThatThrownBy(() -> jdbc.update(insert, "Patient B", doctorId, SLOT.plusMinutes(10)))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("ex_appointment_doctor_no_overlap");
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private AppointmentRequest request(String patient, LocalDateTime time) {
        AppointmentRequest r = new AppointmentRequest();
        r.setPatientName(patient);
        r.setDoctorId(doctorId);
        r.setDoctorName("ignored when doctorId is set");
        r.setAppointmentTime(time);
        r.setDepartment("General");
        return r;
    }

    private int activeAppointments() {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM appointment WHERE doctor_id = ? "
                        + "AND status NOT IN ('CANCELLED', 'NO_SHOW')",
                Integer.class, doctorId);
        return count == null ? 0 : count;
    }

    /** Releases all threads at the same instant and returns each outcome (response or exception). */
    private List<Object> runConcurrently(int threads, IntFunction<AppointmentRequest> requestFor)
            throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch ready = new CountDownLatch(threads);
        CountDownLatch go = new CountDownLatch(1);
        List<Future<Object>> futures = new ArrayList<>();
        try {
            for (int i = 0; i < threads; i++) {
                final AppointmentRequest request = requestFor.apply(i);
                Callable<Object> task = () -> {
                    ready.countDown();
                    go.await();
                    try {
                        return appointmentService.saveAppointment(request);
                    } catch (Exception e) {
                        return e;
                    }
                };
                futures.add(pool.submit(task));
            }
            assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
            go.countDown();

            List<Object> results = new ArrayList<>();
            for (Future<Object> future : futures) {
                results.add(future.get(30, TimeUnit.SECONDS));
            }
            return results;
        } finally {
            pool.shutdownNow();
        }
    }

    private static List<Object> successes(List<Object> results) {
        return results.stream().filter(r -> r instanceof AppointmentResponse).toList();
    }

    private static List<Object> failures(List<Object> results) {
        return results.stream().filter(r -> r instanceof Exception).toList();
    }
}
