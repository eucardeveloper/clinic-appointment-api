package com.enesucar.clinic_api.integration;

import com.enesucar.clinic_api.DockerAvailableCondition;
import com.enesucar.clinic_api.entity.Appointment;
import com.enesucar.clinic_api.repository.AppointmentRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * "Postman test" for the whole API: no token, forged token, wrong role, and (the part that is
 * easy to forget) the right role on somebody else's data. Real filter chain, real schema, real
 * seed accounts.
 */
@SpringBootTest(properties = {
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate",
        "jwt.secret=test-secret-key-for-authorization-tests-32chars!!",
        "app.cookie.secure=false"
})
@AutoConfigureMockMvc
@Testcontainers
@ExtendWith(DockerAvailableCondition.class)
@DisplayName("API authorization")
class ApiAuthorizationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired AppointmentRepository appointments;

    private static final String[][] PROTECTED = {
            {"GET", "/api/appointments"}, {"GET", "/api/appointments/search"}, {"GET", "/api/appointments/1"},
            {"POST", "/api/appointments"}, {"PUT", "/api/appointments/1"},
            {"PATCH", "/api/appointments/1/status"}, {"DELETE", "/api/appointments/1"},
            {"GET", "/api/doctors"}, {"POST", "/api/doctors"}, {"PUT", "/api/doctors/1"}, {"DELETE", "/api/doctors/1"},
            {"GET", "/api/departments"}, {"POST", "/api/departments"}, {"DELETE", "/api/departments/1"},
            {"GET", "/api/admin/users"}, {"DELETE", "/api/admin/users/1"}, {"GET", "/api/auth/me"},
    };

    private MockHttpServletRequestBuilder request(String method, String path) {
        return org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request(HttpMethod.valueOf(method), path).contentType(MediaType.APPLICATION_JSON).content("{}");
    }

    private Cookie login(String username, String password) throws Exception {
        MvcResult result = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk()).andReturn();
        Cookie cookie = result.getResponse().getCookie("access_token");
        assertThat(cookie).isNotNull();
        return cookie;
    }

    private Long appointmentOf(String patientUsername) {
        return appointments.findByPatientUsername(patientUsername).get(0).getId();
    }

    @Test
    @DisplayName("no token: every protected endpoint answers 401")
    void anonymousIsRejectedEverywhere() throws Exception {
        for (String[] r : PROTECTED) {
            mvc.perform(request(r[0], r[1])).andExpect(status().isUnauthorized());
        }
    }

    @Test
    @DisplayName("forged token: 401")
    void forgedTokenIsRejected() throws Exception {
        mvc.perform(get("/api/appointments").cookie(new Cookie("access_token", "eyJhbGciOiJIUzI1NiJ9.e30.forged")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("PATIENT cannot use admin/doctor operations: 403")
    void patientIsForbiddenFromPrivilegedRoutes() throws Exception {
        Cookie patient = login("patient1", "patient123");
        Long own = appointmentOf("patient1");
        mvc.perform(delete("/api/appointments/" + own).cookie(patient)).andExpect(status().isForbidden());
        mvc.perform(request("PATCH", "/api/appointments/" + own + "/status").cookie(patient)).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/users").cookie(patient)).andExpect(status().isForbidden());
        mvc.perform(request("POST", "/api/doctors").cookie(patient)).andExpect(status().isForbidden());
        mvc.perform(request("DELETE", "/api/departments/1").cookie(patient)).andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("PATIENT only sees and changes their own appointments; others look like 404")
    void patientIsLimitedToOwnData() throws Exception {
        Cookie patient1 = login("patient1", "patient123");
        Long others = appointmentOf("patient2");

        mvc.perform(get("/api/appointments/" + others).cookie(patient1)).andExpect(status().isNotFound());
        mvc.perform(request("PUT", "/api/appointments/" + others).cookie(patient1)
                .content("{\"patientName\":\"X Y\",\"doctorName\":\"Dr. James Wilson\","
                        + "\"appointmentTime\":\"2031-01-05T10:00:00\",\"department\":\"Cardiology\"}"))
                .andExpect(status().isNotFound());

        String search = mvc.perform(get("/api/appointments/search?size=100").cookie(patient1))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        JsonNode content = json.readTree(search).get("content");
        assertThat(content.size()).isPositive();
        content.forEach(n -> assertThat(n.get("patientUsername").asText()).isEqualTo("patient1"));

        String list = mvc.perform(get("/api/appointments").cookie(patient1))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        json.readTree(list).forEach(n -> assertThat(n.get("patientUsername").asText()).isEqualTo("patient1"));
    }

    @Test
    @DisplayName("PATIENT cannot book in someone else's name: the login wins over the body")
    void patientCannotSpoofPatientUsername() throws Exception {
        Cookie patient1 = login("patient1", "patient123");
        String body = mvc.perform(post("/api/appointments").cookie(patient1).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"patientName\":\"Ahmet Yilmaz\",\"patientUsername\":\"patient2\","
                                + "\"doctorName\":\"Dr. James Wilson\",\"appointmentTime\":\"2031-02-03T11:00:00\","
                                + "\"department\":\"Cardiology\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(json.readTree(body).get("patientUsername").asText()).isEqualTo("patient1");
    }

    @Test
    @DisplayName("DOCTOR only sees their own schedule")
    void doctorIsLimitedToOwnSchedule() throws Exception {
        Cookie doctor = login("dr.wilson", "doctor123");
        String search = mvc.perform(get("/api/appointments/search?size=100").cookie(doctor))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        JsonNode content = json.readTree(search).get("content");
        assertThat(content.size()).isPositive();
        content.forEach(n -> assertThat(n.get("doctorName").asText()).isEqualTo("Dr. James Wilson"));

        Appointment other = appointments.findAll().stream()
                .filter(a -> "Dr. Emily Carter".equals(a.getDoctorName())).findFirst().orElseThrow();
        mvc.perform(get("/api/appointments/" + other.getId()).cookie(doctor)).andExpect(status().isNotFound());
        mvc.perform(request("PATCH", "/api/appointments/" + other.getId() + "/status").cookie(doctor)
                .content("{\"status\":\"CONFIRMED\"}")).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("ADMIN sees every appointment")
    void adminSeesEverything() throws Exception {
        Cookie admin = login("admin", "admin123");
        String search = mvc.perform(get("/api/appointments/search?size=100").cookie(admin))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(json.readTree(search).get("content").size()).isGreaterThan(5);
    }
}
