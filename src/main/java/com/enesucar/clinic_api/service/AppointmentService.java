package com.enesucar.clinic_api.service;

import com.enesucar.clinic_api.dto.AppointmentRequest;
import com.enesucar.clinic_api.dto.AppointmentResponse;
import com.enesucar.clinic_api.dto.PagedResponse;
import com.enesucar.clinic_api.dto.StatusTransitionRequest;
import com.enesucar.clinic_api.entity.Appointment;
import com.enesucar.clinic_api.entity.AppointmentStatus;
import com.enesucar.clinic_api.entity.Doctor;
import com.enesucar.clinic_api.exception.AppointmentConflictException;
import com.enesucar.clinic_api.exception.AppointmentNotFoundException;
import com.enesucar.clinic_api.exception.DoctorNotFoundException;
import com.enesucar.clinic_api.exception.InvalidStatusTransitionException;
import com.enesucar.clinic_api.repository.AppointmentRepository;
import com.enesucar.clinic_api.repository.AppointmentSpecs;
import com.enesucar.clinic_api.repository.DoctorRepository;
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
import java.util.List;

@Service
public class AppointmentService {

    private static final int SLOT_DURATION_MINUTES = 30;
    private static final int ALTERNATIVE_SLOTS_COUNT = 3;

    private static final List<AppointmentStatus> INACTIVE_STATUSES =
            List.of(AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW);

    private final AppointmentRepository appointmentRepository;
    private final DoctorRepository doctorRepository;

    public AppointmentService(AppointmentRepository appointmentRepository,
                              DoctorRepository doctorRepository) {
        this.appointmentRepository = appointmentRepository;
        this.doctorRepository = doctorRepository;
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
            // Prefer patientUsername (V9+); fall back to patientName for legacy rows
            visible = appointmentRepository.findByPatientUsername(username);
            if (visible.isEmpty()) {
                visible = appointmentRepository.findByPatientName(username);
            }
        }

        return visible.stream().map(this::toResponse).toList();
    }

    private static boolean hasRole(Authentication auth, String role) {
        return auth.getAuthorities().stream()
                .anyMatch(a -> role.equals(a.getAuthority()));
    }

    /** Lower-cased, escaped LIKE pattern for the doctor-name filter; blank/null means no filter (null). */
    static String likePattern(String input) {
        if (input == null || input.isBlank()) return null;
        String escaped = input.trim().toLowerCase(java.util.Locale.ROOT)
                .replace("!", "!!").replace("%", "!%").replace("_", "!_");
        return "%" + escaped + "%";
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
                .findAll(AppointmentSpecs.filtered(status, likePattern(doctorName), from, to, null, null), pageable)
                .map(this::toResponse);

        return new PagedResponse<>(page);
    }

    /** Same as above, restricted to one patient's or one doctor's appointments (null = no restriction). */
    public PagedResponse<AppointmentResponse> searchAppointments(
            AppointmentStatus status,
            String doctorName,
            LocalDateTime from,
            LocalDateTime to,
            String patientUsername,
            Long doctorId,
            Pageable pageable) {

        Page<AppointmentResponse> page = appointmentRepository
                .findAll(AppointmentSpecs.filtered(status, likePattern(doctorName), from, to, patientUsername, doctorId), pageable)
                .map(this::toResponse);

        return new PagedResponse<>(page);
    }

    /**
     * Books an appointment.
     *
     * <p>Concurrency: the doctor row is locked (SELECT ... FOR UPDATE) BEFORE the conflict
     * check, so two requests for the same doctor run one after the other: the second sees the
     * first one's committed row and receives a 409. The database exclusion constraint
     * ex_appointment_doctor_no_overlap is the final guarantee if any path skips this lock.
     */
    @Transactional
    public AppointmentResponse saveAppointment(AppointmentRequest request) {
        Doctor doctor = lockDoctor(request);
        checkConflict(doctor, request.getAppointmentTime(), -1L);

        Appointment appointment = new Appointment();
        appointment.setPatientName(request.getPatientName());
        appointment.setPatientUsername(request.getPatientUsername());
        appointment.setDoctorId(doctor.getId());
        appointment.setDoctorName(doctor.getName());
        appointment.setAppointmentTime(request.getAppointmentTime());
        appointment.setDepartment(request.getDepartment());
        return toResponse(appointmentRepository.saveAndFlush(appointment));
    }

    public AppointmentResponse findAppointment(Long id) {
        return toResponse(findById(id));
    }

    @Transactional
    public AppointmentResponse updateAppointment(Long id, AppointmentRequest request) {
        Doctor doctor = lockDoctor(request);
        checkConflict(doctor, request.getAppointmentTime(), id);

        Appointment appointment = findById(id);
        appointment.setPatientName(request.getPatientName());
        appointment.setPatientUsername(request.getPatientUsername());
        appointment.setDoctorId(doctor.getId());
        appointment.setDoctorName(doctor.getName());
        appointment.setAppointmentTime(request.getAppointmentTime());
        appointment.setDepartment(request.getDepartment());
        return toResponse(appointmentRepository.saveAndFlush(appointment));
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
     * Resolves the requested doctor (by id when given, otherwise by name) and takes a
     * PESSIMISTIC_WRITE lock on that row for the rest of the transaction.
     */
    private Doctor lockDoctor(AppointmentRequest request) {
        Long doctorId = request.getDoctorId();
        if (doctorId == null) {
            doctorId = doctorRepository
                    .findFirstByNameIgnoreCaseOrderByIdAsc(request.getDoctorName())
                    .map(Doctor::getId)
                    .orElseThrow(() -> new DoctorNotFoundException(request.getDoctorName()));
        }
        Long id = doctorId;
        return doctorRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new DoctorNotFoundException(String.valueOf(id)));
    }

    /**
     * Checks for scheduling conflicts and throws AppointmentConflictException
     * with the next 3 free slots if a conflict is found.
     */
    private void checkConflict(Doctor doctor, LocalDateTime time, Long excludeId) {
        LocalDateTime from = time.minusMinutes(SLOT_DURATION_MINUTES);
        LocalDateTime to   = time.plusMinutes(SLOT_DURATION_MINUTES);

        List<Appointment> conflicts = appointmentRepository
                .findConflicting(doctor.getId(), excludeId, INACTIVE_STATUSES, from, to);

        if (!conflicts.isEmpty()) {
            List<LocalDateTime> alternatives = findAlternativeSlots(doctor.getId(), time);
            throw new AppointmentConflictException(doctor.getName(), time, alternatives);
        }
    }

    /**
     * Finds the next ALTERNATIVE_SLOTS_COUNT free 30-minute slots for the doctor
     * starting from the requested time. Skips already-booked slots.
     */
    private List<LocalDateTime> findAlternativeSlots(Long doctorId, LocalDateTime requestedTime) {
        // Fetch all booked times from requestedTime onward
        List<LocalDateTime> booked = appointmentRepository
                .findBookedSlots(doctorId, INACTIVE_STATUSES, requestedTime);

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
            if (isSlotFree(candidate, booked)) {
                alternatives.add(candidate);
            }
            candidate = candidate.plusMinutes(SLOT_DURATION_MINUTES);
        }

        return alternatives;
    }

    /**
     * A slot is free when no booked appointment starts within 30 minutes of it
     * (the same overlap rule the database exclusion constraint enforces).
     */
    private boolean isSlotFree(LocalDateTime candidate, List<LocalDateTime> bookedStarts) {
        LocalDateTime earliest = candidate.minusMinutes(SLOT_DURATION_MINUTES);
        LocalDateTime latest = candidate.plusMinutes(SLOT_DURATION_MINUTES);
        for (LocalDateTime booked : bookedStarts) {
            if (booked.isAfter(earliest) && booked.isBefore(latest)) {
                return false;
            }
        }
        return true;
    }

    private AppointmentResponse toResponse(Appointment appointment) {
        AppointmentResponse response = new AppointmentResponse();
        response.setId(appointment.getId());
        response.setPatientName(appointment.getPatientName());
        response.setPatientUsername(appointment.getPatientUsername());
        response.setDoctorId(appointment.getDoctorId());
        response.setDoctorName(appointment.getDoctorName());
        response.setAppointmentTime(appointment.getAppointmentTime());
        response.setDepartment(appointment.getDepartment());
        response.setStatus(appointment.getStatus());
        response.setAllowedTransitions(appointment.getStatus().getAllowedTransitions());
        return response;
    }
}
