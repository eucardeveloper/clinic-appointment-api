package com.enesucar.clinic_api;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.List;

/**
 * CORS configuration.
 *
 * allowCredentials=true is required for httpOnly cookie (BFF pattern) to work
 * cross-origin. When credentials are enabled, allowedOrigins cannot be "*" —
 * must be an explicit list. Update ALLOWED_ORIGINS for production.
 */
@Configuration
public class CorsConfig {

    private static final List<String> ALLOWED_ORIGINS = List.of(
            "http://localhost:3000",   // Next.js dev
            "http://localhost:3001"    // alternate dev port
    );

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(ALLOWED_ORIGINS);
        config.addAllowedMethod("*");
        config.addAllowedHeader("*");
        config.setAllowCredentials(true); // Required for httpOnly cookie
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}
