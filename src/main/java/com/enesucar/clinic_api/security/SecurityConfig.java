package com.enesucar.clinic_api.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Stateless JWT security configuration.
 *
 * Role hierarchy:
 *   ADMIN  — full access
 *   DOCTOR — read all appointments, transition status
 *   PATIENT — create appointments, read own appointments
 *
 * Session is STATELESS — no HttpSession, token in httpOnly cookie (BFF pattern).
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final OriginCheckFilter originCheckFilter;
    private final UserDetailsService userDetailsService;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter,
                          OriginCheckFilter originCheckFilter,
                          UserDetailsService userDetailsService) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.originCheckFilter = originCheckFilter;
        this.userDetailsService = userDetailsService;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // Spring's token-based CSRF is disabled on purpose, NOT because the API is "stateless":
            // the JWT is in a cookie, which browsers send automatically. CSRF is instead handled by
            // SameSite=Strict on the cookie + OriginCheckFilter + JSON-only bodies (see OriginCheckFilter).
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Public endpoints
                .requestMatchers("/api/auth/login", "/api/auth/logout").permitAll()
                .requestMatchers("/api/auth/me").authenticated()
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()

                // Status transitions: ADMIN or DOCTOR only
                .requestMatchers(HttpMethod.PATCH, "/api/appointments/*/status")
                    .hasAnyRole("ADMIN", "DOCTOR")

                // Delete: ADMIN only
                .requestMatchers(HttpMethod.DELETE, "/api/appointments/**")
                    .hasRole("ADMIN")

                // Create + Update: authenticated users (PATIENT, DOCTOR, ADMIN)
                .requestMatchers(HttpMethod.POST, "/api/appointments").authenticated()
                .requestMatchers(HttpMethod.PUT, "/api/appointments/**").authenticated()

                // Read: authenticated users
                .requestMatchers(HttpMethod.GET, "/api/appointments/**").authenticated()

                // Master data: anyone signed in may read doctors/departments, only ADMIN may change them.
                // Enforced here as well as with @PreAuthorize so the 403 comes before the request body is
                // parsed or validated (a forbidden caller must not learn about validation rules).
                .requestMatchers(HttpMethod.POST, "/api/doctors/**", "/api/departments/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/doctors/**", "/api/departments/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PATCH, "/api/doctors/**", "/api/departments/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/doctors/**", "/api/departments/**").hasRole("ADMIN")

                // Admin user management
                .requestMatchers("/api/admin/users/**").hasRole("ADMIN")

                .anyRequest().authenticated()
            )
            // Anonymous requests answer 401 (Spring's default would be 403)
            .exceptionHandling(ex -> ex.authenticationEntryPoint(
                    new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(originCheckFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
