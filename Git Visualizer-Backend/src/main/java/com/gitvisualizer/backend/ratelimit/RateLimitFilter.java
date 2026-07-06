package com.gitvisualizer.backend.ratelimit;

import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

/**
 * Global IP-based rate limiting on all public API endpoints.
 * Over-limit requests get 429 with a Retry-After header (seconds).
 * Actuator endpoints are excluded so orchestrator health checks never throttle.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimiterBackend rateLimiter;
    private final RateLimitProperties properties;

    public RateLimitFilter(RateLimiterBackend rateLimiter, RateLimitProperties properties) {
        this.rateLimiter = rateLimiter;
        this.properties = properties;
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
        response.setStatus(429);
        response.setHeader("Retry-After", String.valueOf(retryAfterSeconds));
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(
                "{\"status\":429,\"error\":\"Too Many Requests\",\"message\":\"Rate limit exceeded. Retry after "
                        + retryAfterSeconds + " seconds.\"}");
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
