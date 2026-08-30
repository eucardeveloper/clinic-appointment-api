package com.enesucar.clinic_api.entity;

import java.util.Map;
import java.util.Set;

/**
 * Represents the lifecycle of an appointment.
 *
 * State machine:
 *   PENDING → CONFIRMED → COMPLETED
 *                       → NO_SHOW
 *   PENDING → CANCELLED
 *   CONFIRMED → CANCELLED
 *
 * Only ADMIN and DOCTOR roles may trigger transitions (enforced at service layer).
 */
public enum AppointmentStatus {

    PENDING,
    CONFIRMED,
    COMPLETED,
    CANCELLED,
    NO_SHOW;

    // Defines which transitions are legal FROM each state.
    private static final Map<AppointmentStatus, Set<AppointmentStatus>> ALLOWED_TRANSITIONS = Map.of(
            PENDING,    Set.of(CONFIRMED, CANCELLED),
            CONFIRMED,  Set.of(COMPLETED, CANCELLED, NO_SHOW),
            COMPLETED,  Set.of(),
            CANCELLED,  Set.of(),
            NO_SHOW,    Set.of()
    );

    /**
     * Returns the set of states this status can legally transition to.
     */
    public Set<AppointmentStatus> getAllowedTransitions() {
        return ALLOWED_TRANSITIONS.getOrDefault(this, Set.of());
    }

    /**
     * Returns true if transitioning to {@code target} is a legal move.
     */
    public boolean canTransitionTo(AppointmentStatus target) {
        return getAllowedTransitions().contains(target);
    }
}
