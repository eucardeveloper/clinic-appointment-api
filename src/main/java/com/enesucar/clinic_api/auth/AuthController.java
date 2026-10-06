package com.enesucar.clinic_api.auth;

import com.enesucar.clinic_api.security.JwtService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.util.Optional;

/**
 * Authentication endpoints.
 *
 * POST /api/auth/login  — validates credentials, sets httpOnly JWT cookie (BFF pattern)
 * GET  /api/auth/me     — returns current user info from cookie
 * POST /api/auth/logout — clears the JWT cookie
 *
 * Security: JWT is never exposed to JavaScript (XSS-safe).
 * The cookie is HttpOnly, SameSite=Strict by default and Secure by default.
 * Both are configurable (app.cookie.secure, app.cookie.same-site); plain-HTTP demos set
 * app.cookie.secure=false explicitly (see docker-compose.yml), production never should.
 */
@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "Login, logout and current-user endpoints")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final AppUserRepository appUserRepository;
    private final boolean cookieSecure;
    private final String cookieSameSite;

    public AuthController(AuthenticationManager authenticationManager,
                          JwtService jwtService,
                          AppUserRepository appUserRepository,
                          @Value("${app.cookie.secure:true}") boolean cookieSecure,
                          @Value("${app.cookie.same-site:Strict}") String cookieSameSite) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.appUserRepository = appUserRepository;
        this.cookieSecure = cookieSecure;
        this.cookieSameSite = cookieSameSite;
    }

    @PostMapping("/login")
    @Operation(summary = "Authenticate and receive httpOnly JWT cookie")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Login successful — access_token cookie set"),
        @ApiResponse(responseCode = "401", description = "Invalid credentials"),
    })
    public ResponseEntity<LoginResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse response) {

        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));

        UserDetails userDetails = (UserDetails) auth.getPrincipal();
        String token = jwtService.generateToken(userDetails);

        response.addHeader(HttpHeaders.SET_COOKIE, buildTokenCookie(token, 24 * 60 * 60)); // 24h

        String role = userDetails.getAuthorities().iterator().next().getAuthority();
        return ResponseEntity.ok(new LoginResponse(userDetails.getUsername(), role, "Login successful"));
    }

    @GetMapping("/me")
    @Operation(summary = "Return current authenticated user (reads JWT from cookie)")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "User info returned"),
        @ApiResponse(responseCode = "401", description = "Not authenticated"),
    })
    public ResponseEntity<MeResponse> me(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) return ResponseEntity.status(401).build();
        String role = userDetails.getAuthorities().iterator().next().getAuthority();
        String displayName = appUserRepository.findByUsername(userDetails.getUsername())
                .map(AppUser::getDisplayName)
                .orElse(null);
        return ResponseEntity.ok(new MeResponse(userDetails.getUsername(), role, displayName));
    }

    @PostMapping("/logout")
    @Operation(summary = "Clear JWT cookie and invalidate session")
    @ApiResponse(responseCode = "204", description = "Cookie cleared")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, buildTokenCookie("", 0)); // max-age=0 removes cookie
        return ResponseEntity.noContent().build();
    }

    private String buildTokenCookie(String value, long maxAgeSeconds) {
        return ResponseCookie.from("access_token", value)
                .httpOnly(true)               // JS cannot read it: prevents XSS token theft
                .secure(cookieSecure)         // only sent over HTTPS (browsers also allow http://localhost)
                .sameSite(cookieSameSite)     // not sent on cross-site requests: main CSRF defence
                .path("/")
                .maxAge(maxAgeSeconds)
                .build()
                .toString();
    }
}
