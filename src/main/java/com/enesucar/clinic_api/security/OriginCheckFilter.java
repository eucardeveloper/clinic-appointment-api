package com.enesucar.clinic_api.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.net.URI;
import java.util.List;
import java.util.Set;

/**
 * CSRF defence for cookie authentication.
 *
 * The JWT lives in a cookie, and browsers attach cookies automatically, so "stateless JWT"
 * is NOT a reason to disable CSRF protection. Defence in depth here:
 * <ol>
 *   <li>the cookie is SameSite=Strict (see AuthController);</li>
 *   <li>this filter rejects state-changing requests (POST/PUT/PATCH/DELETE) whose Origin
 *       (or, if absent, Referer) is not an allowed origin;</li>
 *   <li>the API only accepts application/json bodies, which a cross-site HTML form cannot send
 *       and which forces a CORS preflight for scripts.</li>
 * </ol>
 * Requests with neither Origin nor Referer come from non-browser clients (the Next.js
 * server-side proxy, curl, tests). They cannot be CSRF'd because a browser always sends Origin
 * on cross-origin POSTs, so they are allowed.
 */
@Component
public class OriginCheckFilter extends OncePerRequestFilter {

    private static final Set<String> STATE_CHANGING = Set.of("POST", "PUT", "PATCH", "DELETE");

    private final List<String> allowedOrigins;

    public OriginCheckFilter(
            @Value("${app.cors.allowed-origins:http://localhost:3000,http://localhost:3001,http://localhost:3003}")
            List<String> allowedOrigins) {
        this.allowedOrigins = allowedOrigins;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        if (STATE_CHANGING.contains(request.getMethod())) {
            String origin = originOf(request);
            if (origin != null && !allowedOrigins.contains(origin)) {
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.setContentType("application/problem+json");
                response.getWriter().write(
                        "{\"type\":\"https://clinic-api.example.com/errors/origin-not-allowed\","
                        + "\"title\":\"Origin Not Allowed\",\"status\":403,"
                        + "\"detail\":\"Cross-site state-changing requests are not allowed.\"}");
                return;
            }
        }
        chain.doFilter(request, response);
    }

    /** Origin header, or the origin derived from Referer; null when the client sent neither. */
    private static String originOf(HttpServletRequest request) {
        String origin = request.getHeader("Origin");
        if (origin != null && !origin.isBlank()) {
            return origin;
        }
        String referer = request.getHeader("Referer");
        if (referer != null && !referer.isBlank()) {
            try {
                URI uri = URI.create(referer);
                if (uri.getScheme() != null && uri.getHost() != null) {
                    int port = uri.getPort();
                    return uri.getScheme() + "://" + uri.getHost() + (port == -1 ? "" : ":" + port);
                }
            } catch (IllegalArgumentException ignored) {
                return "invalid-referer";
            }
            return "invalid-referer";
        }
        return null;
    }
}
