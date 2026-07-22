package com.enesucar.klinik_api.controller;

import com.enesucar.klinik_api.dto.TerminRequest;
import com.enesucar.klinik_api.dto.TerminResponse;
import com.enesucar.klinik_api.service.TerminService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/termine")
public class TerminController {

    private final TerminService terminService;

    public TerminController(TerminService terminService) {
        this.terminService = terminService;
    }

    @GetMapping
    public ResponseEntity<Page<TerminResponse>> alleTermine(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(terminService.alleTermine(page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TerminResponse> terminFinden(@PathVariable Long id) {
        return ResponseEntity.ok(terminService.terminFinden(id));
    }

    @PostMapping
    public ResponseEntity<TerminResponse> terminErstellen(@Valid @RequestBody TerminRequest request) {
        return ResponseEntity.ok(terminService.terminSpeichern(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TerminResponse> terminAktualisieren(@PathVariable Long id, @Valid @RequestBody TerminRequest request) {
        return ResponseEntity.ok(terminService.terminAktualisieren(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> terminLoeschen(@PathVariable Long id) {
        terminService.terminLoeschen(id);
        return ResponseEntity.noContent().build();
    }
}