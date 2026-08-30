package com.enesucar.clinic_api.auth;

import com.enesucar.clinic_api.security.JwtService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

/**
 * Authentication endpoints.
 *
 * POST /api/auth/login  — validates credentials, sets httpOnly JWT cookie (BFF pattern)
 * GET  /api/auth/me     — returns current user info from cookie
 * POST /api/auth/logout — clears the JWT cookie
 *
 * Security: JWT is never exposed to JavaScript (XSS-safe).
 * Cookie is HttpOnly; set Secure + SameSite=Strict in production.
 */
@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "Login, logout and current-user endpoints")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthController(AuthenticationManager authenticationManager, JwtService jwtService) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
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

        response.addCookie(buildTokenCookie(token, 24 * 60 * 60)); // 24h

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
        return ResponseEntity.ok(new MeResponse(userDetails.getUsername(), role));
    }

    @PostMapping("/logout")
    @Operation(summary = "Clear JWT cookie and invalidate session")
    @ApiResponse(responseCode = "204", description = "Cookie cleared")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        response.addCookie(buildTokenCookie("", 0)); // max-age=0 removes cookie
        return ResponseEntity.noContent().build();
    }

    private Cookie buildTokenCookie(String value, int maxAge) {
        Cookie cookie = new Cookie("access_token", value);
        cookie.setHttpOnly(true); // JS cannot read — prevents XSS token theft
        cookie.setPath("/");
        cookie.setMaxAge(maxAge);
        // cookie.setSecure(true);               // enable for HTTPS production
        // cookie.setAttribute("SameSite", "Strict"); // enable for production CSRF protection
        return cookie;
    }
}
