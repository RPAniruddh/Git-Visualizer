package com.gitvisualizer.backend.ratelimit;

import io.lettuce.core.RedisClient;
import io.lettuce.core.RedisURI;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RateLimitConfig {

    @Bean(destroyMethod = "shutdown")
    @ConditionalOnProperty(name = "app.ratelimit.backend", havingValue = "redis")
    public RedisClient rateLimitRedisClient(
            @Value("${spring.data.redis.host}") String host,
            @Value("${spring.data.redis.port}") int port) {
        return RedisClient.create(RedisURI.builder().withHost(host).withPort(port).build());
    }

    @Bean
    @ConditionalOnProperty(name = "app.ratelimit.backend", havingValue = "redis")
    public RateLimiterBackend redisRateLimiterBackend(RedisClient rateLimitRedisClient,
                                                      RateLimitProperties properties) {
        return new RedisRateLimiter(rateLimitRedisClient, properties);
    }

    @Bean
    @ConditionalOnProperty(name = "app.ratelimit.backend", havingValue = "local", matchIfMissing = true)
    public RateLimiterBackend localRateLimiterBackend(RateLimitProperties properties) {
        return new LocalRateLimiter(properties);
    }
}
