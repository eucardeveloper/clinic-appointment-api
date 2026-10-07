package com.enesucar.clinic_api.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Doctor-name search pattern")
class LikePatternTest {

    @Test
    @DisplayName("blank or missing input means no filter")
    void blankMatchesAll() {
        assertThat(AppointmentService.likePattern(null)).isNull();
        assertThat(AppointmentService.likePattern("   ")).isNull();
    }

    @Test
    @DisplayName("input is lower-cased and wrapped for a contains-search")
    void containsSearch() {
        assertThat(AppointmentService.likePattern(" Weber ")).isEqualTo("%weber%");
    }

    @Test
    @DisplayName("LIKE wildcards typed by the user are matched literally")
    void wildcardsAreEscaped() {
        assertThat(AppointmentService.likePattern("50%_off!")).isEqualTo("%50!%!_off!!%");
    }
}
