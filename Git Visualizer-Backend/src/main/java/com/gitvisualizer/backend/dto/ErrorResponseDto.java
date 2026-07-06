package com.gitvisualizer.backend.dto;

import java.time.Instant;

/** Standard error body for 4xx responses. */
public record ErrorResponseDto(
        Instant timestamp,
        int status,
        String error,
        String message) {
}
