package com.gitvisualizer.backend.web;

import com.gitvisualizer.backend.seed.ContentSeeder;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Internal content-management endpoint. Protected by the X-API-Key filter
 * (see ApiKeyFilter) — not part of the public frontend contract.
 */
@RestController
@RequestMapping("/api/v1/admin")
@Tag(name = "Admin", description = "Internal content management (requires X-API-Key)")
public class AdminController {

    private final ContentSeeder contentSeeder;

    public AdminController(ContentSeeder contentSeeder) {
        this.contentSeeder = contentSeeder;
    }

    @PostMapping("/reseed")
    @Operation(summary = "Re-load git-commands-content.json into the database",
            description = "Replaces all stored commands and workflows with the current seed file contents.")
    @ApiResponse(responseCode = "200", description = "Re-seed completed")
    @ApiResponse(responseCode = "401", description = "Missing or invalid X-API-Key")
    public Map<String, Object> reseed() {
        ContentSeeder.SeedResult result = contentSeeder.reseed();
        return Map.of(
                "status", "reseeded",
                "commands", result.commands(),
                "workflows", result.workflows());
    }
}
