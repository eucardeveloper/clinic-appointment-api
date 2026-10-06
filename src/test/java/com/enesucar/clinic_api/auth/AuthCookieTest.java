package com.enesucar.clinic_api.auth;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

@DisplayName("access_token cookie attributes")
class AuthCookieTest {

    private AuthController controller(boolean secure, String sameSite) {
        return new AuthController(
                mock(org.springframework.security.authentication.AuthenticationManager.class),
                mock(com.enesucar.clinic_api.security.JwtService.class),
                mock(AppUserRepository.class),
                secure, sameSite);
    }

    @Test
    @DisplayName("defaults: HttpOnly, Secure and SameSite=Strict")
    void secureDefaults() {
        MockHttpServletResponse response = new MockHttpServletResponse();

        controller(true, "Strict").logout(response);

        String cookie = response.getHeader(HttpHeaders.SET_COOKIE);
        assertThat(cookie)
                .contains("access_token=")
                .contains("HttpOnly")
                .contains("Secure")
                .contains("SameSite=Strict")
                .contains("Path=/")
                .contains("Max-Age=0");
    }

    @Test
    @DisplayName("local HTTP demo can opt out of Secure explicitly, SameSite stays on")
    void localDemoOptOut() {
        MockHttpServletResponse response = new MockHttpServletResponse();

        controller(false, "Strict").logout(response);

        String cookie = response.getHeader(HttpHeaders.SET_COOKIE);
        assertThat(cookie).doesNotContain("Secure").contains("HttpOnly").contains("SameSite=Strict");
    }
}
