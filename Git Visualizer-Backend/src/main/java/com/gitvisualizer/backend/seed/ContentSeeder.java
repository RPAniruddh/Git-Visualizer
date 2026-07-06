package com.gitvisualizer.backend.seed;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gitvisualizer.backend.domain.GitCommandEntity;
import com.gitvisualizer.backend.domain.WorkflowEntity;
import com.gitvisualizer.backend.repository.GitCommandRepository;
import com.gitvisualizer.backend.repository.WorkflowRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Loads git-commands-content.json into the database on startup.
 * The file is authoritative: every run replaces the stored content wholesale,
 * so shipping an updated JSON re-seeds on the next boot (or via POST /api/v1/admin/reseed).
 * Uses TransactionTemplate (not @Transactional) so the replace stays atomic even
 * when invoked directly from the ApplicationRunner (self-invocation bypasses proxies).
 */
@Component
public class ContentSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ContentSeeder.class);

    private final GitCommandRepository commandRepository;
    private final WorkflowRepository workflowRepository;
    private final ObjectMapper objectMapper;
    private final ResourceLoader resourceLoader;
    private final TransactionTemplate transactionTemplate;
    private final String seedFileLocation;

    public ContentSeeder(GitCommandRepository commandRepository,
                         WorkflowRepository workflowRepository,
                         ObjectMapper objectMapper,
                         ResourceLoader resourceLoader,
                         TransactionTemplate transactionTemplate,
                         @Value("${app.content.seed-file}") String seedFileLocation) {
        this.commandRepository = commandRepository;
        this.workflowRepository = workflowRepository;
        this.objectMapper = objectMapper;
        this.resourceLoader = resourceLoader;
        this.transactionTemplate = transactionTemplate;
        this.seedFileLocation = seedFileLocation;
    }

    @Override
    public void run(ApplicationArguments args) {
        reseed();
    }

    public SeedResult reseed() {
        SeedFile seedFile = readSeedFile();
        if (seedFile.commands() == null || seedFile.commands().isEmpty()) {
            throw new IllegalStateException("Seed file has no commands — refusing to wipe existing content");
        }

        List<GitCommandEntity> commands = seedFile.commands().stream()
                .map(c -> new GitCommandEntity(c.id(), c.title(), c.category(), c.shortExplanation(),
                        c.syntax(), c.hints(), c.howItWorks(), c.beforeGraph(), c.afterGraph(), c.sandboxSeed()))
                .toList();
        List<WorkflowEntity> workflows = seedFile.workflows() == null ? List.of()
                : seedFile.workflows().stream()
                .map(w -> new WorkflowEntity(w.id(), w.title(), w.description(), w.steps(), w.note()))
                .toList();

        try {
            applySeed(commands, workflows);
        } catch (DataIntegrityViolationException e) {
            // Another replica seeded the same fresh database concurrently and won an
            // insert race. Its rows now exist, so a single retry turns our writes
            // into updates with identical content.
            log.warn("Concurrent seed detected ({}), retrying once", e.getMessage());
            applySeed(commands, workflows);
        }

        log.info("Seeded {} commands and {} workflows from {}", commands.size(), workflows.size(), seedFileLocation);
        return new SeedResult(commands.size(), workflows.size());
    }

    /**
     * Upsert every entry from the file and prune rows whose ids are no longer
     * present — idempotent, so concurrent replicas converge on identical content.
     */
    private void applySeed(List<GitCommandEntity> commands, List<WorkflowEntity> workflows) {
        transactionTemplate.executeWithoutResult(status -> {
            Set<String> commandIds = commands.stream().map(GitCommandEntity::getId).collect(Collectors.toSet());
            List<String> staleCommandIds = commandRepository.findAll().stream()
                    .map(GitCommandEntity::getId)
                    .filter(id -> !commandIds.contains(id))
                    .toList();
            commandRepository.deleteAllByIdInBatch(staleCommandIds);

            Set<String> workflowIds = workflows.stream().map(WorkflowEntity::getId).collect(Collectors.toSet());
            List<String> staleWorkflowIds = workflowRepository.findAll().stream()
                    .map(WorkflowEntity::getId)
                    .filter(id -> !workflowIds.contains(id))
                    .toList();
            workflowRepository.deleteAllByIdInBatch(staleWorkflowIds);

            commandRepository.saveAll(commands);
            workflowRepository.saveAll(workflows);
        });
    }

    private SeedFile readSeedFile() {
        Resource resource = resourceLoader.getResource(seedFileLocation);
        try (InputStream in = resource.getInputStream()) {
            return objectMapper.readValue(in, SeedFile.class);
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot read seed file: " + seedFileLocation, e);
        }
    }

    public record SeedResult(int commands, int workflows) {
    }
}
