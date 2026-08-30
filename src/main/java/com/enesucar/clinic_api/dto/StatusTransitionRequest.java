package com.enesucar.clinic_api.dto;

import com.enesucar.clinic_api.entity.AppointmentStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class StatusTransitionRequest {

    @NotNull(message = "Target status must not be null")
    private AppointmentStatus status;
}
