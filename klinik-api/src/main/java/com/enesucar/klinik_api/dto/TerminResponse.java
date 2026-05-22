package com.enesucar.klinik_api.dto;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter
@Setter
public class TerminResponse {

    private Long id;
    private String patientName;
    private String arztName;
    private LocalDateTime terminZeit;
    private String abteilung;
}
