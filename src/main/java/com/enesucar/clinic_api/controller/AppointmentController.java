package com.enesucar.clinic_api.controller;

import com.enesucar.clinic_api.dto.AppointmentRequest;
import com.enesucar.clinic_api.dto.AppointmentResponse;
import com.enesucar.clinic_api.dto.PagedResponse;
import com.enesucar.clinic_api.dto.StatusTransitionRequest;
import com.enesucar.clinic_api.entity.AppointmentStatus;
import com.enesucar.clinic_api.service.AppointmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/appointments")
@Tag(name = "Appointments", description = "Manage clinic appointments")
public class AppointmentController {

    private final AppointmentService appointmentService;

    public AppointmentController(AppointmentService appointmentService) {
        this.appointmentService = appointmentService;
    }

    @GetMapping
    @Operation(summary = "List all appointments (no pagination)")
    public ResponseEntity<List<AppointmentResponse>> getAllAppointments() {
        return ResponseEntity.ok(appointmentService.getAllAppointments());
    }

    @GetMapping("/search")
    @Operation(
        summary = "Search appointments with filters and pagination",
        description = "All params optional. Sort example: appointmentTime,asc"
    )
    public ResponseEntity<PagedResponse<AppointmentResponse>> searchAppointments(
            @RequestParam(required = false) AppointmentStatus status,
            @RequestParam(required = false) String doctorName,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "appointmentTime") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir) {

        Sort sort = sortDir.equalsIgnoreCase("desc")
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();

        Pageable pageable = PageRequest.of(page, size, sort);
        return ResponseEntity.ok(appointmentService.searchAppointments(status, doctorName, from, to, pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get appointment by ID")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Appointment found"),
        @ApiResponse(responseCode = "404", description = "Appointment not found")
    })
    public ResponseEntity<AppointmentResponse> findAppointment(@PathVariable Long id) {
        return ResponseEntity.ok(appointmentService.findAppointment(id));
    }

    @PostMapping
    @Operation(summary = "Create a new appointment")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Appointment created"),
        @ApiResponse(responseCode = "400", description = "Validation failed"),
        @ApiResponse(responseCode = "409", description = "Doctor has a conflicting appointment")
    })
    public ResponseEntity<AppointmentResponse> createAppointment(
            @Valid @RequestBody AppointmentRequest request) {
        return ResponseEntity.ok(appointmentService.saveAppointment(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an appointment")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Appointment updated"),
        @ApiResponse(responseCode = "400", description = "Validation failed"),
        @ApiResponse(responseCode = "404", description = "Appointment not found"),
        @ApiResponse(responseCode = "409", description = "Doctor has a conflicting appointment")
    })
    public ResponseEntity<AppointmentResponse> updateAppointment(
            @PathVariable Long id,
            @Valid @RequestBody AppointmentRequest request) {
        return ResponseEntity.ok(appointmentService.updateAppointment(id, request));
    }

    @PatchMapping("/{id}/status")
    @Operation(
        summary = "Transition appointment status",
        description = "PENDING→CONFIRMED, PENDING→CANCELLED, CONFIRMED→COMPLETED, " +
                      "CONFIRMED→CANCELLED, CONFIRMED→NO_SHOW. Requires ADMIN or DOCTOR role."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Status updated"),
        @ApiResponse(responseCode = "403", description = "Insufficient role"),
        @ApiResponse(responseCode = "404", description = "Appointment not found"),
        @ApiResponse(responseCode = "409", description = "Transition not allowed by state machine")
    })
    public ResponseEntity<AppointmentResponse> transitionStatus(
            @PathVariable Long id,
            @Valid @RequestBody StatusTransitionRequest request) {
        return ResponseEntity.ok(appointmentService.transitionStatus(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete an appointment (ADMIN only)")
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Appointment deleted"),
        @ApiResponse(responseCode = "403", description = "Insufficient role"),
        @ApiResponse(responseCode = "404", description = "Appointment not found")
    })
    public ResponseEntity<Void> deleteAppointment(@PathVariable Long id) {
        appointmentService.deleteAppointment(id);
        return ResponseEntity.noContent().build();
    }
}
