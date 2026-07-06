package com.gitvisualizer.backend;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Required seed verification (prompt §7): confirms every id present in
 * git-commands-content.json is retrievable via GET /api/v1/commands/{id}
 * and GET /api/v1/workflows/{id} after seeding, with content matching the file.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SeedVerificationIT {

    private static JsonNode seedFile;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeAll
    static void loadSeedFile() throws Exception {
        try (InputStream in = SeedVerificationIT.class.getResourceAsStream("/git-commands-content.json")) {
            seedFile = new ObjectMapper().readTree(in);
        }
    }

    @TestFactory
    List<DynamicTest> everyCommandIdIsRetrievable() {
        List<DynamicTest> tests = new ArrayList<>();
        for (JsonNode command : seedFile.get("commands")) {
            String id = command.get("id").asText();
            tests.add(DynamicTest.dynamicTest("GET /api/v1/commands/" + id, () ->
                    mockMvc.perform(get("/api/v1/commands/{id}", id))
                            .andExpect(status().isOk())
                            .andExpect(jsonPath("$.id").value(id))
                            .andExpect(jsonPath("$.title").value(command.get("title").asText()))
                            .andExpect(jsonPath("$.category").value(command.get("category").asText()))
                            .andExpect(jsonPath("$.shortExplanation").value(command.get("shortExplanation").asText()))
                            .andExpect(jsonPath("$.howItWorks").value(command.get("howItWorks").asText()))
                            .andExpect(jsonPath("$.syntax.length()").value(command.get("syntax").size()))
                            .andExpect(jsonPath("$.hints.length()").value(command.get("hints").size()))));
        }
        return tests;
    }

    @TestFactory
    List<DynamicTest> everyWorkflowIdIsRetrievable() {
        List<DynamicTest> tests = new ArrayList<>();
        for (JsonNode workflow : seedFile.get("workflows")) {
            String id = workflow.get("id").asText();
            tests.add(DynamicTest.dynamicTest("GET /api/v1/workflows/" + id, () ->
                    mockMvc.perform(get("/api/v1/workflows/{id}", id))
                            .andExpect(status().isOk())
                            .andExpect(jsonPath("$.id").value(id))
                            .andExpect(jsonPath("$.title").value(workflow.get("title").asText()))
                            .andExpect(jsonPath("$.description").value(workflow.get("description").asText()))
                            .andExpect(jsonPath("$.steps.length()").value(workflow.get("steps").size()))
                            .andExpect(jsonPath("$.note").value(workflow.get("note").asText()))));
        }
        return tests;
    }

    @Test
    void commandListContainsEverySeedId() throws Exception {
        String body = mockMvc.perform(get("/api/v1/commands"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode list = objectMapper.readTree(body);

        List<String> returnedIds = new ArrayList<>();
        list.forEach(node -> returnedIds.add(node.get("id").asText()));

        List<String> seedIds = new ArrayList<>();
        seedFile.get("commands").forEach(node -> seedIds.add(node.get("id").asText()));

        assertThat(returnedIds).containsExactlyInAnyOrderElementsOf(seedIds);
    }

    @Test
    void workflowListContainsEverySeedId() throws Exception {
        String body = mockMvc.perform(get("/api/v1/workflows"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode list = objectMapper.readTree(body);

        List<String> returnedIds = new ArrayList<>();
        list.forEach(node -> returnedIds.add(node.get("id").asText()));

        List<String> seedIds = new ArrayList<>();
        seedFile.get("workflows").forEach(node -> seedIds.add(node.get("id").asText()));

        assertThat(returnedIds).containsExactlyInAnyOrderElementsOf(seedIds);
    }
}
