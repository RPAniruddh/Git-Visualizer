package com.gitvisualizer.backend.service;

import com.gitvisualizer.backend.domain.GitCommandEntity;
import com.gitvisualizer.backend.dto.CommandDetailDto;
import com.gitvisualizer.backend.dto.CommandSummaryDto;
import com.gitvisualizer.backend.dto.WorkflowDetailDto;
import com.gitvisualizer.backend.dto.WorkflowSummaryDto;
import com.gitvisualizer.backend.repository.GitCommandRepository;
import com.gitvisualizer.backend.repository.WorkflowRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class ContentService {

    private final GitCommandRepository commandRepository;
    private final WorkflowRepository workflowRepository;

    public ContentService(GitCommandRepository commandRepository, WorkflowRepository workflowRepository) {
        this.commandRepository = commandRepository;
        this.workflowRepository = workflowRepository;
    }

    public List<CommandSummaryDto> listCommands(String category) {
        List<GitCommandEntity> entities = (category == null || category.isBlank())
                ? commandRepository.findAll()
                : commandRepository.findAllByCategoryIgnoreCase(category.trim());
        return entities.stream()
                .map(e -> new CommandSummaryDto(e.getId(), e.getTitle(), e.getCategory(), e.getShortExplanation()))
                .toList();
    }

    public CommandDetailDto getCommand(String id) {
        return commandRepository.findById(id)
                .map(e -> new CommandDetailDto(e.getId(), e.getTitle(), e.getCategory(), e.getShortExplanation(),
                        e.getSyntax(), e.getHints(), e.getHowItWorks(), e.getBeforeGraph(), e.getAfterGraph(),
                        e.getSandboxSeed()))
                .orElseThrow(() -> new NotFoundException("Command not found: " + id));
    }

    public List<WorkflowSummaryDto> listWorkflows() {
        return workflowRepository.findAll().stream()
                .map(e -> new WorkflowSummaryDto(e.getId(), e.getTitle(), e.getDescription()))
                .toList();
    }

    public WorkflowDetailDto getWorkflow(String id) {
        return workflowRepository.findById(id)
                .map(e -> new WorkflowDetailDto(e.getId(), e.getTitle(), e.getDescription(), e.getSteps(), e.getNote()))
                .orElseThrow(() -> new NotFoundException("Workflow not found: " + id));
    }
}
