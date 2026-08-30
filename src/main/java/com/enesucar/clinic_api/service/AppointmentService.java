package com.enesucar.clinic_api.service;

import com.enesucar.clinic_api.dto.AppointmentRequest;
import com.enesucar.clinic_api.dto.AppointmentResponse;
import com.enesucar.clinic_api.dto.PagedResponse;
import com.enesucar.clinic_api.dto.StatusTransitionRequest;
import com.enesucar.clinic_api.entity.Appointment;
import com.enesucar.clinic_api.entity.AppointmentStatus;
import com.enesucar.clinic_api.exception.AppointmentConflictException;
import com.enesucar.clinic_api.exception.AppointmentNotFoundException;
import com.enesucar.clinic_api.exception.InvalidStatusTransitionException;
import com.enesucar.clinic_api.repository.AppointmentRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class AppointmentService {

    private static final int SLOT_DURATION_MINUTES = 30;
    private static final int ALTERNATIVE_SLOTS_COUNT = 3;

    private static final List<AppointmentStatus> INACTIVE_STATUSES =
            List.of(AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW);

    private final AppointmentRepository appointmentRepository;

    public AppointmentService(AppointmentRepository appointmentRepository) {
        this.appointmentRepository = appointmentRepository;
    }

    /**
     * Returns the appointments the CURRENT caller is allowed to see.
     *
     * <p>SECURITY — this used to be an unfiltered {@code findAll()} behind nothing but
     * {@code .authenticated()}. Any logged-in patient could therefore read every other
     * patient's name, doctor, department and appointment time. Under GDPR Art. 9 that is
     * special-category health data, so this was a reportable broad-read (IDOR) defect, not
     * a cosmetic one.
     *
     * <p>Authentication answers "who are you"; it does not answer "what may you see".
     * Authorization is enforced here, at the service layer, so it holds regardless of which
     * controller or future caller invokes it:
     * <ul>
     *   <li>ADMIN  — the whole schedule (operational necessity).</li>
     *   <li>DOCTOR — only the appointments assigned to them.</li>
     *   <li>PATIENT — only their own appointments.</li>
     * </ul>
     */
    public List<AppointmentResponse> getAllAppointments() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new AccessDeniedException("Authentication required");
        }

        String username = auth.getName();
        boolean isAdmin = hasRole(auth, "ROLE_ADMIN");
        boolean isDoctor = hasRole(auth, "ROLE_DOCTOR");

        List<Appointment> visible;
        if (isAdmin) {
            visible = appointmentRepository.findAll();
        } else if (isDoctor) {
            visible = appointmentRepository.findByDoctorUsername(username);
        } else {
            visible = appointmentRepository.findByPatientName(username);
        }

        return visible.stream().map(this::toResponse).toList();
    }

    private static boolean hasRole(Authentication auth, String role) {
        return auth.getAuthorities().stream()
                .anyMatch(a -> role.equals(a.getAuthority()));
    }

    /**
     * Filtered + paginated list.
     * All filter params are optional — pass null to ignore.
     */
    public PagedResponse<AppointmentResponse> searchAppointments(
            AppointmentStatus status,
            String doctorName,
            LocalDateTime from,
            LocalDateTime to,
            Pageable pageable) {

        Page<AppointmentResponse> page = appointmentRepository
                .findFiltered(status, doctorName, from, to, pageable)
                .map(this::toResponse);

        return new PagedResponse<>(page);
    }

    @Transactional
    public AppointmentResponse saveAppointment(AppointmentRequest request) {
        checkConflict(request.getDoctorName(), request.getAppointmentTime(), -1L);

        Appointment appointment = new Appointment();
        appointment.setPatientName(request.getPatientName());
        appointment.setDoctorName(request.getDoctorName());
        appointment.setAppointmentTime(request.getAppointmentTime());
        appointment.setDepartment(request.getDepartment());
        return toResponse(appointmentRepository.save(appointment));
    }

    public AppointmentResponse findAppointment(Long id) {
        return toResponse(findById(id));
    }

    @Transactional
    public AppointmentResponse updateAppointment(Long id, AppointmentRequest request) {
        checkConflict(request.getDoctorName(), request.getAppointmentTime(), id);

        Appointment appointment = findById(id);
        appointment.setPatientName(request.getPatientName());
        appointment.setDoctorName(request.getDoctorName());
        appointment.setAppointmentTime(request.getAppointmentTime());
        appointment.setDepartment(request.getDepartment());
        return toResponse(appointmentRepository.save(appointment));
    }

    @PreAuthorize("hasAnyRole('ADMIN')")
    public void deleteAppointment(Long id) {
        if (!appointmentRepository.existsById(id)) {
            throw new AppointmentNotFoundException(id);
        }
        appointmentRepository.deleteById(id);
    }

    /**
     * Transitions appointment status.
     * Only ADMIN or DOCTOR may call this — enforced by @PreAuthorize.
     */
    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR')")
    public AppointmentResponse transitionStatus(Long id, StatusTransitionRequest request) {
        Appointment appointment = findById(id);

        AppointmentStatus current = appointment.getStatus();
        AppointmentStatus target  = request.getStatus();

        if (!current.canTransitionTo(target)) {
            throw new InvalidStatusTransitionException(current, target);
        }

        appointment.setStatus(target);
        return toResponse(appointment);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private Appointment findById(Long id) {
        return appointmentRepository.findById(id)
                .orElseThrow(() -> new AppointmentNotFoundException(id));
    }

    /**
     * Checks for scheduling conflicts and throws AppointmentConflictException
     * with the next 3 free slots if a conflict is found.
     */
    private void checkConflict(String doctorName, LocalDateTime time, Long excludeId) {
        LocalDateTime from = time.minusMinutes(SLOT_DURATION_MINUTES);
        LocalDateTime to   = time.plusMinutes(SLOT_DURATION_MINUTES);

        List<Appointment> conflicts = appointmentRepository
                .findConflicting(doctorName, excludeId, INACTIVE_STATUSES, from, to);

        if (!conflicts.isEmpty()) {
            List<LocalDateTime> alternatives = findAlternativeSlots(doctorName, time, excludeId);
            throw new AppointmentConflictException(doctorName, time, alternatives);
        }
    }

    /**
     * Finds the next ALTERNATIVE_SLOTS_COUNT free 30-minute slots for the doctor
     * starting from the requested time. Skips already-booked slots.
     */
    private List<LocalDateTime> findAlternativeSlots(String doctorName,
                                                      LocalDateTime requestedTime,
                                                      Long excludeId) {
        // Fetch all booked times from requestedTime onward
        List<LocalDateTime> booked = appointmentRepository
                .findBookedSlots(doctorName, INACTIVE_STATUSES, requestedTime);

        Set<LocalDateTime> bookedSet = new HashSet<>(booked);

        List<LocalDateTime> alternatives = new ArrayList<>();
        LocalDateTime candidate = requestedTime.plusMinutes(SLOT_DURATION_MINUTES);

        // Walk forward in 30-min increments, skip booked, collect 3 free slots
        while (alternatives.size() < ALTERNATIVE_SLOTS_COUNT) {
            // Skip non-working hours (before 08:00 or after 18:00)
            int hour = candidate.getHour();
            if (hour < 8 || hour >= 18) {
                candidate = candidate.toLocalDate().plusDays(1)
                        .atTime(8, 0);
                continue;
            }
            if (!bookedSet.contains(candidate)) {
                alternatives.add(candidate);
            }
            candidate = candidate.plusMinutes(SLOT_DURATION_MINUTES);
        }

        return alternatives;
    }

    private AppointmentResponse toResponse(Appointment appointment) {
        AppointmentResponse response = new AppointmentResponse();
        response.setId(appointment.getId());
        response.setPatientName(appointment.getPatientName());
        response.setDoctorName(appointment.getDoctorName());
        response.setAppointmentTime(appointment.getAppointmentTime());
        response.setDepartment(appointment.getDepartment());
        response.setStatus(appointment.getStatus());
        response.setAllowedTransitions(appointment.getStatus().getAllowedTransitions());
        return response;
    }
}
