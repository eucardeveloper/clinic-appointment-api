package com.enesucar.clinic_api.service;

import com.enesucar.clinic_api.dto.AppointmentRequest;
import com.enesucar.clinic_api.dto.AppointmentResponse;
import com.enesucar.clinic_api.dto.StatusTransitionRequest;
import com.enesucar.clinic_api.entity.Appointment;
import com.enesucar.clinic_api.entity.AppointmentStatus;
import com.enesucar.clinic_api.entity.Doctor;
import com.enesucar.clinic_api.exception.AppointmentConflictException;
import com.enesucar.clinic_api.exception.AppointmentNotFoundException;
import com.enesucar.clinic_api.exception.DoctorNotFoundException;
import com.enesucar.clinic_api.exception.InvalidStatusTransitionException;
import com.enesucar.clinic_api.repository.AppointmentRepository;
import com.enesucar.clinic_api.repository.DoctorRepository;
import org.mockito.InOrder;
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

    @Mock
    private DoctorRepository doctorRepository;

    @InjectMocks
    private AppointmentService appointmentService;

    private Doctor doctor;
    private Appointment pendingAppointment;
    private final LocalDateTime futureTime = LocalDateTime.now().plusDays(1);

    @BeforeEach
    void setUp() {
        doctor = new Doctor();
        doctor.setId(7L);
        doctor.setName("dr.weber");

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
        givenDoctorResolvableByName();
        when(appointmentRepository.findConflicting(any(), any(), any(), any(), any()))
                .thenReturn(List.of());
        when(appointmentRepository.saveAndFlush(any())).thenReturn(pendingAppointment);

        AppointmentRequest request = buildRequest("Thomas Müller", "dr.weber", futureTime, "Cardiology");
        AppointmentResponse response = appointmentService.saveAppointment(request);

        assertThat(response.getStatus()).isEqualTo(AppointmentStatus.PENDING);
        verify(appointmentRepository).saveAndFlush(any(Appointment.class));
    }

    @Test
    @DisplayName("saveAppointment locks the doctor row before checking for conflicts")
    void saveAppointment_locksDoctorBeforeConflictCheck() {
        givenDoctorResolvableByName();
        when(appointmentRepository.findConflicting(any(), any(), any(), any(), any()))
                .thenReturn(List.of());
        when(appointmentRepository.saveAndFlush(any())).thenReturn(pendingAppointment);

        appointmentService.saveAppointment(
                buildRequest("Thomas Müller", "dr.weber", futureTime, "Cardiology"));

        InOrder order = inOrder(doctorRepository, appointmentRepository);
        order.verify(doctorRepository).findByIdForUpdate(7L);
        order.verify(appointmentRepository).findConflicting(eq(7L), anyLong(), any(), any(), any());
        order.verify(appointmentRepository).saveAndFlush(any(Appointment.class));
    }

    @Test
    @DisplayName("saveAppointment uses doctorId when given and ignores the name lookup")
    void saveAppointment_doctorIdTakesPrecedence() {
        when(doctorRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(doctor));
        when(appointmentRepository.findConflicting(any(), any(), any(), any(), any()))
                .thenReturn(List.of());
        when(appointmentRepository.saveAndFlush(any())).thenReturn(pendingAppointment);

        AppointmentRequest request = buildRequest("Thomas Müller", "some other name", futureTime, "Cardiology");
        request.setDoctorId(7L);
        appointmentService.saveAppointment(request);

        verify(doctorRepository, never()).findFirstByNameIgnoreCaseOrderByIdAsc(any());
    }

    @Test
    @DisplayName("saveAppointment throws DoctorNotFoundException for an unknown doctor")
    void saveAppointment_unknownDoctor() {
        when(doctorRepository.findFirstByNameIgnoreCaseOrderByIdAsc("nobody"))
                .thenReturn(Optional.empty());

        AppointmentRequest request = buildRequest("Thomas Müller", "nobody", futureTime, "Cardiology");

        assertThatThrownBy(() -> appointmentService.saveAppointment(request))
                .isInstanceOf(DoctorNotFoundException.class);

        verify(appointmentRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("saveAppointment throws 409 when doctor has conflict")
    void saveAppointment_conflict() {
        givenDoctorResolvableByName();
        when(appointmentRepository.findConflicting(any(), any(), any(), any(), any()))
                .thenReturn(List.of(pendingAppointment));

        AppointmentRequest request = buildRequest("Anna Schmidt", "dr.weber", futureTime, "Cardiology");

        assertThatThrownBy(() -> appointmentService.saveAppointment(request))
                .isInstanceOf(AppointmentConflictException.class);

        verify(appointmentRepository, never()).saveAndFlush(any());
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

    private void givenDoctorResolvableByName() {
        when(doctorRepository.findFirstByNameIgnoreCaseOrderByIdAsc("dr.weber"))
                .thenReturn(Optional.of(doctor));
        when(doctorRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(doctor));
    }

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
