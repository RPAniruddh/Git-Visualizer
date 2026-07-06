package com.gitvisualizer.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/** Explicit allowed origins for the frontend — never "*". */
@ConfigurationProperties(prefix = "app.cors")
public record CorsProperties(List<String> allowedOrigins) {
}
