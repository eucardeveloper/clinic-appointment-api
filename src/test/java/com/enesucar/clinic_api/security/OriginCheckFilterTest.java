package com.enesucar.clinic_api.security;

import jakarta.servlet.ServletException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("OriginCheckFilter (CSRF defence for cookie auth)")
class OriginCheckFilterTest {

    private final OriginCheckFilter filter =
            new OriginCheckFilter(List.of("http://localhost:3000", "http://localhost:3003"));

    @Test
    @DisplayName("POST from a foreign Origin is rejected with 403 and never reaches the controller")
    void foreignOrigin_post_returns403() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/appointments");
        request.addHeader("Origin", "https://evil.example");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(chain.getRequest()).isNull();
    }

    @Test
    @DisplayName("POST from an allowed Origin passes")
    void allowedOrigin_post_passes() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/appointments");
        request.addHeader("Origin", "http://localhost:3000");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(chain.getRequest()).isNotNull();
    }

    @Test
    @DisplayName("without Origin the Referer is checked")
    void foreignReferer_delete_returns403() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("DELETE", "/api/appointments/1");
        request.addHeader("Referer", "https://evil.example/page?x=1");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(403);
    }

    @Test
    @DisplayName("allowed Referer passes")
    void allowedReferer_put_passes() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("PUT", "/api/appointments/1");
        request.addHeader("Referer", "http://localhost:3003/admin");
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, new MockHttpServletResponse(), chain);

        assertThat(chain.getRequest()).isNotNull();
    }

    @Test
    @DisplayName("requests with neither Origin nor Referer are non-browser clients and pass")
    void noOriginNoReferer_post_passes() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/appointments");
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, new MockHttpServletResponse(), chain);

        assertThat(chain.getRequest()).isNotNull();
    }

    @Test
    @DisplayName("safe methods are never blocked")
    void foreignOrigin_get_passes() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/appointments");
        request.addHeader("Origin", "https://evil.example");
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, new MockHttpServletResponse(), chain);

        assertThat(chain.getRequest()).isNotNull();
    }
}
