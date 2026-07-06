package com.gitvisualizer.backend;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Verifies the /api/v1/workflows endpoints match the contract in prompt §1a exactly. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class WorkflowApiIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void listReturnsExactSummaryShape() throws Exception {
        String body = mockMvc.perform(get("/api/v1/workflows"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode list = objectMapper.readTree(body);
        assertThat(list.isArray()).isTrue();
        assertThat(list).isNotEmpty();
        for (JsonNode item : list) {
            List<String> keys = new ArrayList<>();
            item.fieldNames().forEachRemaining(keys::add);
            assertThat(keys).containsExactlyInAnyOrder("id", "title", "description");
        }
    }

    @Test
    void detailReturnsExactDetailShape() throws Exception {
        String body = mockMvc.perform(get("/api/v1/workflows/daily-feature-workflow"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode detail = objectMapper.readTree(body);
        List<String> keys = new ArrayList<>();
        detail.fieldNames().forEachRemaining(keys::add);
        assertThat(keys).containsExactlyInAnyOrder("id", "title", "description", "steps", "note");
        assertThat(detail.get("steps").isArray()).isTrue();
    }

    @Test
    void unknownIdReturns404() throws Exception {
        mockMvc.perform(get("/api/v1/workflows/does-not-exist"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }
}
