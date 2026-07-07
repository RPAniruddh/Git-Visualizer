package com.gitvisualizer.backend.ratelimit;

import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

/**
 * Global IP-based rate limiting on all public API endpoints.
 * Over-limit requests get 429 with a Retry-After header (seconds).
 * Actuator endpoints are excluded so orchestrator health checks never throttle.
 *
 * This filter runs before Spring Security, so when it short-circuits with 429 the
 * security CORS handling never executes. It therefore adds the CORS allow-origin
 * header itself (reusing the same CorsConfigurationSource) — otherwise the browser
 * would block the 429 as a CORS error and the frontend would see a generic network
 * failure instead of the rate-limit response.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimiterBackend rateLimiter;
    private final RateLimitProperties properties;
    private final CorsConfigurationSource corsConfigurationSource;

    public RateLimitFilter(RateLimiterBackend rateLimiter, RateLimitProperties properties,
                           CorsConfigurationSource corsConfigurationSource) {
        this.rateLimiter = rateLimiter;
        this.properties = properties;
        this.corsConfigurationSource = corsConfigurationSource;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !properties.enabled() || !request.getRequestURI().startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String clientIp = resolveClientIp(request);
        ConsumptionProbe probe = rateLimiter.tryConsume(clientIp);

        if (probe.isConsumed()) {
            response.setHeader("X-RateLimit-Remaining", String.valueOf(probe.getRemainingTokens()));
            filterChain.doFilter(request, response);
            return;
        }

        long retryAfterSeconds = Math.max(1,
                TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill()) + 1);
        applyCorsHeaders(request, response);
        response.setStatus(429);
        response.setHeader("Retry-After", String.valueOf(retryAfterSeconds));
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(
                "{\"status\":429,\"error\":\"Too Many Requests\",\"message\":\"Rate limit exceeded. Retry after "
                        + retryAfterSeconds + " seconds.\"}");
    }

    /**
     * Mirror Spring Security's CORS response for allowed origins, so a rate-limited
     * cross-origin request is still readable by the browser. Only sets the header
     * when the request carries an Origin the configured allow-list accepts.
     */
    private void applyCorsHeaders(HttpServletRequest request, HttpServletResponse response) {
        String origin = request.getHeader(HttpHeaders.ORIGIN);
        if (origin == null) {
            return;
        }
        CorsConfiguration config = corsConfigurationSource.getCorsConfiguration(request);
        if (config != null && config.checkOrigin(origin) != null) {
            response.setHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, origin);
            response.addHeader(HttpHeaders.VARY, HttpHeaders.ORIGIN);
        }
    }

    private String resolveClientIp(HttpServletRequest request) {
        // Nginx (the only entrypoint in production) sets X-Forwarded-For;
        // the first entry is the original client.
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            int comma = forwarded.indexOf(',');
            return (comma > 0 ? forwarded.substring(0, comma) : forwarded).trim();
        }
        return request.getRemoteAddr();
    }
}
