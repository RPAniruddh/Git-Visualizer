package com.gitvisualizer.backend.dto;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.List;

/** Shape for GET /api/v1/commands/{id}. */
public record CommandDetailDto(
        String id,
        String title,
        String category,
        String shortExplanation,
        List<String> syntax,
        List<String> hints,
        String howItWorks,
        JsonNode beforeGraph,
        JsonNode afterGraph,
        String sandboxSeed) {
}
