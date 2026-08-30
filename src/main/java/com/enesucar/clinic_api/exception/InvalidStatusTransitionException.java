package com.enesucar.clinic_api.exception;

import com.enesucar.clinic_api.entity.AppointmentStatus;

/**
 * Thrown when a requested status transition is not permitted
 * by the state machine rules defined in {@link AppointmentStatus}.
 */
public class InvalidStatusTransitionException extends RuntimeException {

    public InvalidStatusTransitionException(AppointmentStatus from, AppointmentStatus to) {
        super("Transition from " + from + " to " + to + " is not allowed.");
    }
}
