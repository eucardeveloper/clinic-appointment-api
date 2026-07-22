package com.enesucar.klinik_api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter
@Setter
public class TerminRequest {

    @NotBlank(message = "Patientenname darf nicht leer sein")
    private String patientName;

    @NotBlank(message = "Arztname darf nicht leer sein")
    private String arztName;

    @NotNull(message = "Terminzeit darf nicht leer sein")
    private LocalDateTime terminZeit;

    @NotBlank(message = "Abteilung darf nicht leer sein")
    private String abteilung;

}
