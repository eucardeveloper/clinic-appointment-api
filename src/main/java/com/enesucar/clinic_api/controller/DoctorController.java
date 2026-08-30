package com.enesucar.clinic_api.controller;

import com.enesucar.clinic_api.dto.DoctorRequest;
import com.enesucar.clinic_api.dto.DoctorResponse;
import com.enesucar.clinic_api.dto.StatusPatchRequest;
import com.enesucar.clinic_api.service.DoctorService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/doctors")
public class DoctorController {

    private final DoctorService doctorService;

    public DoctorController(DoctorService doctorService) {
        this.doctorService = doctorService;
    }

    @GetMapping
    public List<DoctorResponse> getAll() {
        return doctorService.findAll();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DoctorResponse> create(@Valid @RequestBody DoctorRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(doctorService.create(request));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public DoctorResponse toggleStatus(@PathVariable Long id,
                                       @RequestBody StatusPatchRequest request) {
        return doctorService.toggleStatus(id, request.active());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        doctorService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
