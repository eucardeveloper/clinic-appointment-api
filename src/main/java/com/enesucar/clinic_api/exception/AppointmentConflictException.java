package com.enesucar.clinic_api.exception;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Thrown when a new appointment overlaps with an existing one for the same doctor.
 * Carries the next 3 available alternative slots so the frontend can suggest them.
 * Results in HTTP 409 Conflict.
 */
public class AppointmentConflictException extends RuntimeException {

    private final List<LocalDateTime> alternativeSlots;

    public AppointmentConflictException(String doctorName, LocalDateTime time,
                                        List<LocalDateTime> alternativeSlots) {
        super("Doctor " + doctorName + " already has an appointment at " + time +
              ". Please choose a different time slot.");
        this.alternativeSlots = alternativeSlots;
    }

    public List<LocalDateTime> getAlternativeSlots() {
        return alternativeSlots;
    }
}
