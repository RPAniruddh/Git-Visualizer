package com.gitvisualizer.backend.web;

import com.gitvisualizer.backend.dto.CommandDetailDto;
import com.gitvisualizer.backend.dto.CommandSummaryDto;
import com.gitvisualizer.backend.service.ContentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/commands")
@Validated
@Tag(name = "Commands", description = "Git command explanations and visualization graph data")
public class CommandController {

    private final ContentService contentService;

    public CommandController(ContentService contentService) {
        this.contentService = contentService;
    }

    @GetMapping
    @Operation(summary = "List all commands for the picker grid",
            description = "Returns id, title, category and shortExplanation for every command. "
                    + "Optionally filter by category.")
    @ApiResponse(responseCode = "200", description = "List of command summaries")
    public List<CommandSummaryDto> listCommands(
            @Parameter(description = "Optional category filter, e.g. 'Setup' or 'Checking state'")
            @RequestParam(required = false)
            @Size(max = 64, message = "category must be at most 64 characters")
            @Pattern(regexp = "^[A-Za-z][A-Za-z ]*$", message = "category may only contain letters and spaces")
            String category) {
        return contentService.listCommands(category);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get the full detail for one command",
            description = "Includes syntax, hints, howItWorks and the beforeGraph/afterGraph visualization states.")
    @ApiResponse(responseCode = "200", description = "Full command detail")
    @ApiResponse(responseCode = "404", description = "No command with that id")
    public CommandDetailDto getCommand(
            @Parameter(description = "Command id, e.g. 'commit' or 'reset-hard'")
            @PathVariable
            @Size(max = 64, message = "id must be at most 64 characters")
            @Pattern(regexp = "^[a-z0-9-]+$", message = "id may only contain lowercase letters, digits and hyphens")
            String id) {
        return contentService.getCommand(id);
    }
}
