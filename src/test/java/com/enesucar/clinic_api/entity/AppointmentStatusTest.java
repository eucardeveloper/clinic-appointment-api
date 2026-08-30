package com.enesucar.clinic_api.entity;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("AppointmentStatus state machine")
class AppointmentStatusTest {

    @ParameterizedTest(name = "{0} → {1} should be ALLOWED")
    @CsvSource({
        "PENDING,   CONFIRMED",
        "PENDING,   CANCELLED",
        "CONFIRMED, COMPLETED",
        "CONFIRMED, CANCELLED",
        "CONFIRMED, NO_SHOW"
    })
    void allowedTransitions(AppointmentStatus from, AppointmentStatus to) {
        assertThat(from.canTransitionTo(to)).isTrue();
    }

    @ParameterizedTest(name = "{0} → {1} should be REJECTED")
    @CsvSource({
        "PENDING,   COMPLETED",
        "PENDING,   NO_SHOW",
        "COMPLETED, CONFIRMED",
        "COMPLETED, PENDING",
        "CANCELLED, PENDING",
        "NO_SHOW,   CONFIRMED"
    })
    void rejectedTransitions(AppointmentStatus from, AppointmentStatus to) {
        assertThat(from.canTransitionTo(to)).isFalse();
    }

    @Test
    @DisplayName("Terminal states have no allowed transitions")
    void terminalStatesHaveNoTransitions() {
        assertThat(AppointmentStatus.COMPLETED.getAllowedTransitions()).isEmpty();
        assertThat(AppointmentStatus.CANCELLED.getAllowedTransitions()).isEmpty();
        assertThat(AppointmentStatus.NO_SHOW.getAllowedTransitions()).isEmpty();
    }
}
