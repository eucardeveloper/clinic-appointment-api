package com.enesucar.clinic_api.service;

import com.enesucar.clinic_api.dto.AppointmentResponse;
import com.enesucar.clinic_api.entity.Appointment;
import com.enesucar.clinic_api.entity.AppointmentStatus;
import com.enesucar.clinic_api.repository.AppointmentRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/**
 * SECURITY REGRESSION TESTS for {@link AppointmentService#getAllAppointments()}.
 *
 * <p>The original implementation was an unfiltered {@code appointmentRepository.findAll()}
 * sitting behind nothing stronger than {@code .authenticated()} in SecurityConfig. Any user
 * who could log in — including every PATIENT — could read the full schedule: every patient's
 * name, their doctor, their department and their appointment time. Under GDPR Art. 9 that is
 * special-category health data.
 *
 * <p>The lesson these tests encode is the one worth remembering: <em>authentication is not
 * authorization</em>. Knowing who someone is tells you nothing about what they may see. The
 * scoping therefore lives in the service layer, not the controller, so it cannot be bypassed
 * by adding a second caller later.
 */
@ExtendWith(MockitoExtension.class)
class AppointmentAuthorizationTest {

    @Mock
    private AppointmentRepository appointmentRepository;

    @InjectMocks
    private AppointmentService appointmentService;

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private void authenticateAs(String username, String role) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        username, "n/a", List.of(new SimpleGrantedAuthority(role))));
    }

    private Appointment appointment(long id, String patient, String doctor) {
        Appointment a = new Appointment();
        a.setId(id);
        a.setPatientName(patient);
        a.setDoctorName(doctor);
        a.setDepartment("Cardiology");
        a.setAppointmentTime(LocalDateTime.now().plusDays(1));
        a.setStatus(AppointmentStatus.PENDING);
        return a;
    }

    @Test
    void admin_shouldSeeEveryAppointment() {
        authenticateAs("admin", "ROLE_ADMIN");
        when(appointmentRepository.findAll()).thenReturn(List.of(
                appointment(1L, "patient1", "Dr. James Wilson"),
                appointment(2L, "patient2", "Dr. Lisa Cuddy")));

        List<AppointmentResponse> result = appointmentService.getAllAppointments();

        assertThat(result).hasSize(2);
        verify(appointmentRepository).findAll();
    }

    @Test
    void doctor_shouldOnlySeeOwnAppointments_neverTheFullTable() {
        authenticateAs("dr.wilson", "ROLE_DOCTOR");
        when(appointmentRepository.findByDoctorUsername("dr.wilson"))
                .thenReturn(List.of(appointment(1L, "patient1", "Dr. James Wilson")));

        List<AppointmentResponse> result = appointmentService.getAllAppointments();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getDoctorName()).isEqualTo("Dr. James Wilson");
        verify(appointmentRepository).findByDoctorUsername("dr.wilson");
        verify(appointmentRepository, never()).findAll();
    }

    /**
     * The exact defect this class exists for: before the fix, this test would have returned
     * every patient in the database.
     */
    @Test
    void patient_shouldOnlySeeOwnAppointments_notOtherPatientsHealthData() {
        authenticateAs("patient1", "ROLE_PATIENT");
        when(appointmentRepository.findByPatientName("patient1"))
                .thenReturn(List.of(appointment(1L, "patient1", "Dr. James Wilson")));

        List<AppointmentResponse> result = appointmentService.getAllAppointments();

        assertThat(result).hasSize(1);
        assertThat(result)
                .as("a patient must never receive another patient's record")
                .allMatch(r -> "patient1".equals(r.getPatientName()));
        verify(appointmentRepository).findByPatientName("patient1");
        verify(appointmentRepository, never()).findAll();
    }

    @Test
    void patient_withNoAppointments_shouldGetEmptyList_notEveryoneElses() {
        authenticateAs("patient9", "ROLE_PATIENT");
        when(appointmentRepository.findByPatientName("patient9")).thenReturn(List.of());

        assertThat(appointmentService.getAllAppointments()).isEmpty();
        verify(appointmentRepository, never()).findAll();
    }
}
