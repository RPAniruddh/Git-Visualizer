package com.gitvisualizer.backend.ratelimit;

import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.ConsumptionProbe;
import io.github.bucket4j.distributed.BucketProxy;
import io.github.bucket4j.distributed.ExpirationAfterWriteStrategy;
import io.github.bucket4j.redis.lettuce.Bucket4jLettuce;
import io.github.bucket4j.redis.lettuce.cas.LettuceBasedProxyManager;
import io.lettuce.core.RedisClient;

import java.nio.charset.StandardCharsets;
import java.time.Duration;

/**
 * Redis-backed buckets via Bucket4j's Lettuce integration. All replicas share
 * the same counters, so the limit holds across the whole load-balanced pool.
 */
public class RedisRateLimiter implements RateLimiterBackend {

    private static final String KEY_PREFIX = "gitviz:ratelimit:";

    private final LettuceBasedProxyManager<byte[]> proxyManager;
    private final BucketConfiguration bucketConfiguration;

    public RedisRateLimiter(RedisClient redisClient, RateLimitProperties properties) {
        this.proxyManager = Bucket4jLettuce.casBasedBuilder(redisClient)
                .expirationAfterWrite(ExpirationAfterWriteStrategy.basedOnTimeForRefillingBucketUpToMax(
                        Duration.ofSeconds(properties.refillPeriodSeconds() * 2)))
                .build();
        this.bucketConfiguration = BucketConfiguration.builder()
                .addLimit(limit -> limit
                        .capacity(properties.capacity())
                        .refillGreedy(properties.refillTokens(), Duration.ofSeconds(properties.refillPeriodSeconds())))
                .build();
    }

    @Override
    public ConsumptionProbe tryConsume(String key) {
        byte[] redisKey = (KEY_PREFIX + key).getBytes(StandardCharsets.UTF_8);
        BucketProxy bucket = proxyManager.getProxy(redisKey, () -> bucketConfiguration);
        return bucket.tryConsumeAndReturnRemaining(1);
    }
}
