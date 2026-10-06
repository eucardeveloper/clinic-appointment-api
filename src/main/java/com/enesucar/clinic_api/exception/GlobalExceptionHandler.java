package com.enesucar.clinic_api.exception;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.net.URI;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AppointmentNotFoundException.class)
    public ProblemDetail handleNotFound(AppointmentNotFoundException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        pd.setTitle("Appointment Not Found");
        pd.setType(URI.create("https://clinic-api.example.com/errors/appointment-not-found"));
        return pd;
    }

    @ExceptionHandler(InvalidStatusTransitionException.class)
    public ProblemDetail handleInvalidTransition(InvalidStatusTransitionException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        pd.setTitle("Invalid Status Transition");
        pd.setType(URI.create("https://clinic-api.example.com/errors/invalid-status-transition"));
        return pd;
    }

    @ExceptionHandler(AppointmentConflictException.class)
    public ProblemDetail handleConflict(AppointmentConflictException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        pd.setTitle("Appointment Conflict");
        pd.setType(URI.create("https://clinic-api.example.com/errors/appointment-conflict"));
        // Frontend reads this to show "nearest 3 alternatives"
        pd.setProperty("alternativeSlots", ex.getAlternativeSlots());
        return pd;
    }

    @ExceptionHandler(DoctorNotFoundException.class)
    public ProblemDetail handleDoctorNotFound(DoctorNotFoundException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        pd.setTitle("Doctor Not Found");
        pd.setType(URI.create("https://clinic-api.example.com/errors/doctor-not-found"));
        return pd;
    }

    /**
     * Safety net behind the application-level check: the database exclusion constraint
     * rejected an overlapping booking that slipped past (for example a write path that does
     * not take the doctor lock). Reported as the same 409 the normal conflict check produces.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ProblemDetail handleDataIntegrity(DataIntegrityViolationException ex) {
        String detail = String.valueOf(ex.getMostSpecificCause().getMessage());
        if (detail.contains("ex_appointment_doctor_no_overlap")) {
            ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT,
                    "The doctor already has an appointment in that time slot. Please choose a different time.");
            pd.setTitle("Appointment Conflict");
            pd.setType(URI.create("https://clinic-api.example.com/errors/appointment-conflict"));
            return pd;
        }
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT,
                "The request conflicts with existing data.");
        pd.setTitle("Data Conflict");
        pd.setType(URI.create("https://clinic-api.example.com/errors/data-conflict"));
        return pd;
    }

    /** The doctor row lock could not be acquired within lock_timeout: ask the client to retry. */
    @ExceptionHandler(PessimisticLockingFailureException.class)
    public ProblemDetail handleLockTimeout(PessimisticLockingFailureException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT,
                "The schedule is being modified by another request. Please retry.");
        pd.setTitle("Concurrent Modification");
        pd.setType(URI.create("https://clinic-api.example.com/errors/concurrent-modification"));
        return pd;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = ex.getBindingResult().getFieldErrors()
                .stream()
                .collect(Collectors.toMap(
                        fe -> fe.getField(),
                        fe -> fe.getDefaultMessage(),
                        (a, b) -> a
                ));
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, "One or more fields failed validation.");
        pd.setTitle("Validation Failed");
        pd.setType(URI.create("https://clinic-api.example.com/errors/validation-failed"));
        pd.setProperty("fieldErrors", fieldErrors);
        return pd;
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ProblemDetail handleAccessDenied(AccessDeniedException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.FORBIDDEN, "You do not have permission to perform this action.");
        pd.setTitle("Access Denied");
        pd.setType(URI.create("https://clinic-api.example.com/errors/access-denied"));
        return pd;
    }
}
