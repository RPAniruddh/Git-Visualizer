package com.gitvisualizer.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * API key protecting /api/v1/admin/**. When blank (default), admin endpoints
 * are disabled entirely rather than left open.
 */
@ConfigurationProperties(prefix = "app.admin")
public record AdminProperties(String apiKey) {
}
