package com.enesucar.klinik_api.controller;

import com.enesucar.klinik_api.dto.TerminRequest;
import com.enesucar.klinik_api.dto.TerminResponse;
import com.enesucar.klinik_api.service.TerminService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/termine")
public class TerminController {

    private final TerminService terminService;

    public TerminController(TerminService terminService) {
        this.terminService = terminService;
    }

    @GetMapping
    public ResponseEntity<List<TerminResponse>> alleTermine() {
        return ResponseEntity.ok(terminService.alleTermine());
    }

    @GetMapping("/{id}") //Entity entpoint get id
    public ResponseEntity<TerminResponse> terminFinden(@PathVariable Long id) {
        return ResponseEntity.ok(terminService.terminFinden(id));
    }

    @PostMapping
    public ResponseEntity<TerminResponse> terminErstellen(@Valid @RequestBody TerminRequest request) {
        return ResponseEntity.ok(terminService.terminSpeichern(request));
    }

    @PutMapping("/{id}") //Entity endpoint güncelleme id'yi
    public ResponseEntity<TerminResponse> terminAktualisieren(@PathVariable Long id, @Valid @RequestBody TerminRequest request) {
        return ResponseEntity.ok(terminService.terminAktualisieren(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> terminLoeschen(@PathVariable Long id) {
        terminService.terminLoeschen(id);
        return ResponseEntity.noContent().build();
    }
}