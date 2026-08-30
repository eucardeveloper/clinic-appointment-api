package com.enesucar.clinic_api.service;

import com.enesucar.clinic_api.dto.AppointmentRequest;
import com.enesucar.clinic_api.dto.AppointmentResponse;
import com.enesucar.clinic_api.dto.StatusTransitionRequest;
import com.enesucar.clinic_api.entity.Appointment;
import com.enesucar.clinic_api.entity.AppointmentStatus;
import com.enesucar.clinic_api.exception.AppointmentConflictException;
import com.enesucar.clinic_api.exception.AppointmentNotFoundException;
import com.enesucar.clinic_api.exception.InvalidStatusTransitionException;
import com.enesucar.clinic_api.repository.AppointmentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AppointmentService unit tests")
class AppointmentServiceTest {

    @Mock
    private AppointmentRepository appointmentRepository;

    @InjectMocks
    private AppointmentService appointmentService;

    private Appointment pendingAppointment;
    private final LocalDateTime futureTime = LocalDateTime.now().plusDays(1);

    @BeforeEach
    void setUp() {
        pendingAppointment = new Appointment();
        pendingAppointment.setId(1L);
        pendingAppointment.setPatientName("Thomas Müller");
        pendingAppointment.setDoctorName("dr.weber");
        pendingAppointment.setAppointmentTime(futureTime);
        pendingAppointment.setDepartment("Cardiology");
        pendingAppointment.setStatus(AppointmentStatus.PENDING);
    }

    // ── findAppointment ───────────────────────────────────────────────────────

    @Test
    @DisplayName("findAppointment returns response when found")
    void findAppointment_found() {
        when(appointmentRepository.findById(1L)).thenReturn(Optional.of(pendingAppointment));

        AppointmentResponse response = appointmentService.findAppointment(1L);

        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getStatus()).isEqualTo(AppointmentStatus.PENDING);
        assertThat(response.getAllowedTransitions())
                .containsExactlyInAnyOrder(AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED);
    }

    @Test
    @DisplayName("findAppointment throws when not found")
    void findAppointment_notFound() {
        when(appointmentRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> appointmentService.findAppointment(99L))
                .isInstanceOf(AppointmentNotFoundException.class);
    }

    // ── saveAppointment ───────────────────────────────────────────────────────

    @Test
    @DisplayName("saveAppointment persists with PENDING status")
    void saveAppointment_success() {
        when(appointmentRepository.findConflicting(any(), any(), any(), any(), any()))
                .thenReturn(List.of());
        when(appointmentRepository.save(any())).thenReturn(pendingAppointment);

        AppointmentRequest request = buildRequest("Thomas Müller", "dr.weber", futureTime, "Cardiology");
        AppointmentResponse response = appointmentService.saveAppointment(request);

        assertThat(response.getStatus()).isEqualTo(AppointmentStatus.PENDING);
        verify(appointmentRepository).save(any(Appointment.class));
    }

    @Test
    @DisplayName("saveAppointment throws 409 when doctor has conflict")
    void saveAppointment_conflict() {
        when(appointmentRepository.findConflicting(any(), any(), any(), any(), any()))
                .thenReturn(List.of(pendingAppointment));

        AppointmentRequest request = buildRequest("Anna Schmidt", "dr.weber", futureTime, "Cardiology");

        assertThatThrownBy(() -> appointmentService.saveAppointment(request))
                .isInstanceOf(AppointmentConflictException.class);

        verify(appointmentRepository, never()).save(any());
    }

    // ── transitionStatus ─────────────────────────────────────────────────────

    @Test
    @DisplayName("transitionStatus PENDING → CONFIRMED succeeds")
    void transition_pendingToConfirmed() {
        when(appointmentRepository.findById(1L)).thenReturn(Optional.of(pendingAppointment));

        StatusTransitionRequest req = new StatusTransitionRequest();
        req.setStatus(AppointmentStatus.CONFIRMED);

        AppointmentResponse response = appointmentService.transitionStatus(1L, req);

        assertThat(response.getStatus()).isEqualTo(AppointmentStatus.CONFIRMED);
        assertThat(response.getAllowedTransitions())
                .containsExactlyInAnyOrder(
                        AppointmentStatus.COMPLETED,
                        AppointmentStatus.CANCELLED,
                        AppointmentStatus.NO_SHOW);
    }

    @Test
    @DisplayName("transitionStatus PENDING → COMPLETED throws InvalidStatusTransitionException")
    void transition_illegalThrows() {
        when(appointmentRepository.findById(1L)).thenReturn(Optional.of(pendingAppointment));

        StatusTransitionRequest req = new StatusTransitionRequest();
        req.setStatus(AppointmentStatus.COMPLETED);

        assertThatThrownBy(() -> appointmentService.transitionStatus(1L, req))
                .isInstanceOf(InvalidStatusTransitionException.class)
                .hasMessageContaining("PENDING")
                .hasMessageContaining("COMPLETED");
    }

    // ── deleteAppointment ─────────────────────────────────────────────────────

    @Test
    @DisplayName("deleteAppointment throws when not found")
    void delete_notFound() {
        when(appointmentRepository.existsById(99L)).thenReturn(false);

        assertThatThrownBy(() -> appointmentService.deleteAppointment(99L))
                .isInstanceOf(AppointmentNotFoundException.class);

        verify(appointmentRepository, never()).deleteById(any());
    }

    // ── helper ───────────────────────────────────────────────────────────────

    private AppointmentRequest buildRequest(String patient, String doctor,
                                            LocalDateTime time, String dept) {
        AppointmentRequest r = new AppointmentRequest();
        r.setPatientName(patient);
        r.setDoctorName(doctor);
        r.setAppointmentTime(time);
        r.setDepartment(dept);
        return r;
    }
}
