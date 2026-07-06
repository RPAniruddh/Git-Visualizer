package com.gitvisualizer.backend.ratelimit;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * IP-based token-bucket settings. backend=redis shares counters across
 * replicas (required for load-balanced deployments); backend=local keeps
 * them in-process (dev/tests only).
 */
@ConfigurationProperties(prefix = "app.ratelimit")
public record RateLimitProperties(
        boolean enabled,
        String backend,
        long capacity,
        long refillTokens,
        long refillPeriodSeconds) {
}
