package com.enesucar.clinic_api.controller;

import org.springframework.transaction.annotation.Transactional;
import com.enesucar.clinic_api.entity.Doctor;
import com.enesucar.clinic_api.repository.DoctorRepository;
import com.enesucar.clinic_api.auth.AppUser;
import com.enesucar.clinic_api.auth.AppUserRepository;
import com.enesucar.clinic_api.dto.CreateUserRequest;
import com.enesucar.clinic_api.dto.UserResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * Admin-only endpoint for user management.
 * Doctors and patients are created here, not via self-registration (MHRS model).
 */
@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin — User Management", description = "Create and manage system users (ADMIN only)")
public class AdminUserController {

    private final AppUserRepository userRepository;
	private final PasswordEncoder   passwordEncoder;
	private final DoctorRepository  doctorRepository;

	public AdminUserController(AppUserRepository userRepository,
                           PasswordEncoder passwordEncoder,
                           DoctorRepository doctorRepository) {
    this.userRepository  = userRepository;
    this.passwordEncoder = passwordEncoder;
    this.doctorRepository = doctorRepository;
}

    @GetMapping
    @Operation(summary = "List all users")
    public List<UserResponse> listUsers() {
        return userRepository.findAll().stream()
                .map(u -> new UserResponse(u.getId(), u.getUsername(), u.getRole(), u.getDisplayName()))
                .toList();
    }

    @PostMapping
	@Transactional
	@Operation(summary = "Create a new doctor or patient account")
	public ResponseEntity<UserResponse> createUser(@Valid @RequestBody CreateUserRequest req) {
    if (userRepository.findByUsername(req.getUsername()).isPresent()) {
        throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Username already exists: " + req.getUsername());
    }
    AppUser user = new AppUser();
    user.setUsername(req.getUsername());
    user.setPassword(passwordEncoder.encode(req.getPassword()));
    user.setRole(req.getRole());
    user.setDisplayName(req.getDisplayName());
    AppUser saved = userRepository.save(user);

    if ("ROLE_DOCTOR".equals(req.getRole())) {
    if (!doctorRepository.existsByUsername(req.getUsername())) {
        Doctor doctor = new Doctor();
        doctor.setName(req.getDisplayName());
        doctor.setUsername(req.getUsername());
        doctor.setEmail(req.getUsername() + "@clinic.local");
        doctor.setActive(true);
        doctorRepository.save(doctor);
    }
}

    return ResponseEntity.status(HttpStatus.CREATED)
            .body(new UserResponse(saved.getId(), saved.getUsername(), saved.getRole(), saved.getDisplayName()));
}


    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a user account")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        if (!userRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + id);
        }
        userRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
