package com.enesucar.clinic_api.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI clinicOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Clinic Appointment API")
                        .description("""
                                REST API for managing clinic appointments.
                                Authentication via httpOnly cookie (BFF pattern).
                                DSGVO/GDPR: patient data falls under Art. 9 sensitive data.
                                Roles: ADMIN / DOCTOR / PATIENT
                                """)
                        .version("1.0.0")
                        .license(new License().name("Private")));
    }
}
