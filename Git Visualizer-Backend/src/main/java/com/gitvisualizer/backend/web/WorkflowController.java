package com.gitvisualizer.backend.web;

import com.gitvisualizer.backend.dto.WorkflowDetailDto;
import com.gitvisualizer.backend.dto.WorkflowSummaryDto;
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
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/workflows")
@Validated
@Tag(name = "Workflows", description = "Guided multi-command lesson paths")
public class WorkflowController {

    private final ContentService contentService;

    public WorkflowController(ContentService contentService) {
        this.contentService = contentService;
    }

    @GetMapping
    @Operation(summary = "List all workflows")
    @ApiResponse(responseCode = "200", description = "List of workflow summaries")
    public List<WorkflowSummaryDto> listWorkflows() {
        return contentService.listWorkflows();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get the full detail for one workflow, including its steps")
    @ApiResponse(responseCode = "200", description = "Full workflow detail")
    @ApiResponse(responseCode = "404", description = "No workflow with that id")
    public WorkflowDetailDto getWorkflow(
            @Parameter(description = "Workflow id, e.g. 'daily-feature-workflow'")
            @PathVariable
            @Size(max = 64, message = "id must be at most 64 characters")
            @Pattern(regexp = "^[a-z0-9-]+$", message = "id may only contain lowercase letters, digits and hyphens")
            String id) {
        return contentService.getWorkflow(id);
    }
}
