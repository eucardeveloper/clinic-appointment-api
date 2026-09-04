package com.enesucar.clinic_api;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
@ExtendWith(DockerAvailableCondition.class)
class ClinicApiApplicationTests {

	@Test
	void contextLoads() {
	}

}
