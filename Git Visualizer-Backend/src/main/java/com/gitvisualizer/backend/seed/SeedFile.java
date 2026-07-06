package com.gitvisualizer.backend.seed;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.JsonNode;

import java.util.List;

/**
 * Mirror of git-commands-content.json — the authoritative content contract.
 * Unknown top-level fields (_notes, categories) are ignored; beforeGraph/afterGraph
 * are kept as opaque JsonNode since their shape is owned by the frontend team.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record SeedFile(List<SeedCommand> commands, List<SeedWorkflow> workflows) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SeedCommand(
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

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SeedWorkflow(
            String id,
            String title,
            String description,
            List<String> steps,
            String note) {
    }
}
