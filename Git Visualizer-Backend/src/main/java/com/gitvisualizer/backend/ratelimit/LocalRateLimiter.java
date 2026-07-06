package com.gitvisualizer.backend.ratelimit;

import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-process buckets. Counters are NOT shared across instances, so this is
 * only suitable for single-instance local development and tests; production
 * (docker-compose) uses RedisRateLimiter.
 */
public class LocalRateLimiter implements RateLimiterBackend {

    private final RateLimitProperties properties;
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    public LocalRateLimiter(RateLimitProperties properties) {
        this.properties = properties;
    }

    @Override
    public ConsumptionProbe tryConsume(String key) {
        Bucket bucket = buckets.computeIfAbsent(key, k -> Bucket.builder()
                .addLimit(limit -> limit
                        .capacity(properties.capacity())
                        .refillGreedy(properties.refillTokens(), Duration.ofSeconds(properties.refillPeriodSeconds())))
                .build());
        return bucket.tryConsumeAndReturnRemaining(1);
    }
}
