package com.enesucar.clinic_api.security;

import com.enesucar.clinic_api.dto.AppointmentRequest;
import com.enesucar.clinic_api.dto.AppointmentResponse;
import com.enesucar.clinic_api.entity.Doctor;
import com.enesucar.clinic_api.exception.AppointmentNotFoundException;
import com.enesucar.clinic_api.repository.DoctorRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Object-level authorization for appointments. Role checks ("may a PATIENT call this endpoint?")
 * live in SecurityConfig; this class answers "may THIS caller see or change THIS appointment?".
 *
 * <ul>
 *   <li>ADMIN: everything.</li>
 *   <li>DOCTOR: appointments assigned to their own doctor record.</li>
 *   <li>PATIENT: appointments whose patient_username is their login.</li>
 * </ul>
 *
 * An appointment the caller may not access is reported as 404, not 403, so ids cannot be probed.
 */
@Component
public class AppointmentAccessPolicy {

    /** Who is calling: login name plus the role flags that matter for scoping. */
    public record Caller(String username, boolean admin, boolean doctor) {
        public boolean patient() {
            return !admin && !doctor;
        }
    }

    private final DoctorRepository doctorRepository;

    public AppointmentAccessPolicy(DoctorRepository doctorRepository) {
        this.doctorRepository = doctorRepository;
    }

    public Caller caller() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            throw new AccessDeniedException("Authentication required");
        }
        boolean admin = auth.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
        boolean doctor = auth.getAuthorities().stream().anyMatch(a -> "ROLE_DOCTOR".equals(a.getAuthority()));
        return new Caller(auth.getName(), admin, doctor);
    }

    /** The doctor record behind a DOCTOR login, or null when the caller is not a doctor. */
    public Long doctorIdOf(Caller caller) {
        if (!caller.doctor() || caller.admin()) {
            return null;
        }
        return doctorRepository.findByUsername(caller.username()).map(Doctor::getId).orElse(-1L);
    }

    public boolean canAccess(Caller caller, AppointmentResponse appointment) {
        if (caller.admin()) {
            return true;
        }
        if (caller.doctor()) {
            Long doctorId = doctorIdOf(caller);
            return doctorId != null && doctorId.equals(appointment.getDoctorId());
        }
        return caller.username().equals(appointment.getPatientUsername());
    }

    /** @throws AppointmentNotFoundException when the caller must not know the appointment exists */
    public void assertCanAccess(AppointmentResponse appointment) {
        if (!canAccess(caller(), appointment)) {
            throw new AppointmentNotFoundException(appointment.getId());
        }
    }

    /**
     * A patient can only book for themselves: whatever patientUsername the client sent is replaced
     * by the authenticated login, so appointments cannot be created in someone else's name.
     */
    public void applyOwnership(AppointmentRequest request) {
        Caller caller = caller();
        if (caller.patient()) {
            request.setPatientUsername(caller.username());
        }
    }
}
