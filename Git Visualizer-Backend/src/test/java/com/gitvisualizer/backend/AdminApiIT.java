package com.gitvisualizer.backend;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.io.InputStream;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Admin content-management endpoint is API-key protected (prompt §4). */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminApiIT {

    private static int seedCommandCount;
    private static int seedWorkflowCount;

    @Autowired
    private MockMvc mockMvc;

    @BeforeAll
    static void countSeedEntries() throws Exception {
        try (InputStream in = AdminApiIT.class.getResourceAsStream("/git-commands-content.json")) {
            JsonNode seedFile = new ObjectMapper().readTree(in);
            seedCommandCount = seedFile.get("commands").size();
            seedWorkflowCount = seedFile.get("workflows").size();
        }
    }

    @Test
    void reseedWithoutKeyIsRejected() throws Exception {
        mockMvc.perform(post("/api/v1/admin/reseed"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void reseedWithWrongKeyIsRejected() throws Exception {
        mockMvc.perform(post("/api/v1/admin/reseed").header("X-API-Key", "wrong-key"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void reseedWithCorrectKeyReplacesContent() throws Exception {
        mockMvc.perform(post("/api/v1/admin/reseed").header("X-API-Key", "test-admin-key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("reseeded"))
                .andExpect(jsonPath("$.commands").value(seedCommandCount))
                .andExpect(jsonPath("$.workflows").value(seedWorkflowCount));
    }
}
