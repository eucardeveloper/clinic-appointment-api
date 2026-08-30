package com.enesucar.clinic_api.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
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
    private final UserDetailsService userDetailsService;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter, UserDetailsService userDetailsService) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.userDetailsService = userDetailsService;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())   // Safe: stateless JWT, no session cookie for state
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

                .anyRequest().authenticated()
            )
            .authenticationProvider(authenticationProvider())
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
