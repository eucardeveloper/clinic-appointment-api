package com.enesucar.clinic_api.exception;

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
