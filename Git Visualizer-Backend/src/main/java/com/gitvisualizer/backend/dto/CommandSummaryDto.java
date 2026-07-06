package com.gitvisualizer.backend.dto;

/** Shape for GET /api/v1/commands — the picker grid. */
public record CommandSummaryDto(
        String id,
        String title,
        String category,
        String shortExplanation) {
}
