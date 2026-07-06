package com.gitvisualizer.backend.dto;

import java.util.List;

/** Shape for GET /api/v1/workflows/{id}. */
public record WorkflowDetailDto(
        String id,
        String title,
        String description,
        List<String> steps,
        String note) {
}
