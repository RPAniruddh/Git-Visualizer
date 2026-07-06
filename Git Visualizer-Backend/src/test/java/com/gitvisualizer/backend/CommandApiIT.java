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

/** Verifies the /api/v1/commands endpoints match the contract in prompt §1a exactly. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CommandApiIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void listReturnsExactSummaryShape() throws Exception {
        String body = mockMvc.perform(get("/api/v1/commands"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode list = objectMapper.readTree(body);
        assertThat(list.isArray()).isTrue();
        assertThat(list).isNotEmpty();
        for (JsonNode item : list) {
            List<String> keys = new ArrayList<>();
            item.fieldNames().forEachRemaining(keys::add);
            assertThat(keys).containsExactlyInAnyOrder("id", "title", "category", "shortExplanation");
        }
    }

    @Test
    void detailReturnsExactDetailShape() throws Exception {
        String body = mockMvc.perform(get("/api/v1/commands/commit"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode detail = objectMapper.readTree(body);
        List<String> keys = new ArrayList<>();
        detail.fieldNames().forEachRemaining(keys::add);
        assertThat(keys).containsExactlyInAnyOrder(
                "id", "title", "category", "shortExplanation",
                "syntax", "hints", "howItWorks", "beforeGraph", "afterGraph", "sandboxSeed");
        assertThat(detail.get("syntax").isArray()).isTrue();
        assertThat(detail.get("hints").isArray()).isTrue();
        // beforeGraph/afterGraph are opaque objects owned by the frontend design
        assertThat(detail.get("beforeGraph").isObject()).isTrue();
        assertThat(detail.get("afterGraph").isObject()).isTrue();
    }

    @Test
    void unknownIdReturns404WithErrorBody() throws Exception {
        mockMvc.perform(get("/api/v1/commands/does-not-exist"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value("Command not found: does-not-exist"));
    }

    @Test
    void categoryFilterReturnsOnlyThatCategory() throws Exception {
        String body = mockMvc.perform(get("/api/v1/commands").param("category", "Setup"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode list = objectMapper.readTree(body);
        assertThat(list).isNotEmpty();
        for (JsonNode item : list) {
            assertThat(item.get("category").asText()).isEqualTo("Setup");
        }
    }

    @Test
    void invalidCategoryParamReturns400() throws Exception {
        mockMvc.perform(get("/api/v1/commands").param("category", "Setup'; DROP TABLE git_commands;--"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void invalidIdFormatReturns400() throws Exception {
        mockMvc.perform(get("/api/v1/commands/{id}", "NOT_A_VALID_ID!"))
                .andExpect(status().isBadRequest());
    }
}
