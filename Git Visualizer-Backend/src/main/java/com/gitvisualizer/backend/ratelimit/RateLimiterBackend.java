package com.gitvisualizer.backend.ratelimit;

import io.github.bucket4j.ConsumptionProbe;

/** Consumes one token from the bucket identified by key (typically a client IP). */
public interface RateLimiterBackend {

    ConsumptionProbe tryConsume(String key);
}
