package com.gitvisualizer.backend.web;

import com.gitvisualizer.backend.config.AdminProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Simple API-key guard for internal content-management endpoints
 * (/api/v1/admin/**). Not a user system — a single shared key supplied
 * via the ADMIN_API_KEY environment variable. When no key is configured,
 * admin endpoints are disabled (404) instead of being left open.
 */
@Component
public class ApiKeyFilter extends OncePerRequestFilter {

    public static final String API_KEY_HEADER = "X-API-Key";

    private final AdminProperties adminProperties;

    public ApiKeyFilter(AdminProperties adminProperties) {
        this.adminProperties = adminProperties;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/v1/admin");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String configuredKey = adminProperties.apiKey();
        if (configuredKey == null || configuredKey.isBlank()) {
            reject(response, HttpServletResponse.SC_NOT_FOUND, "Admin endpoints are disabled");
            return;
        }

        String providedKey = request.getHeader(API_KEY_HEADER);
        if (providedKey == null || !constantTimeEquals(configuredKey, providedKey)) {
            reject(response, HttpServletResponse.SC_UNAUTHORIZED, "Missing or invalid " + API_KEY_HEADER);
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean constantTimeEquals(String expected, String actual) {
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                actual.getBytes(StandardCharsets.UTF_8));
    }

    private void reject(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"status\":" + status + ",\"message\":\"" + message + "\"}");
    }
}
