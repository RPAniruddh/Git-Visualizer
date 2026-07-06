package com.gitvisualizer.backend.dto;

/** Shape for GET /api/v1/workflows. */
public record WorkflowSummaryDto(
        String id,
        String title,
        String description) {
}
