package com.gitvisualizer.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Rate-limit behavior with a tiny bucket: requests beyond capacity get
 * HTTP 429 with a Retry-After header (prompt §5).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "app.ratelimit.capacity=5",
        "app.ratelimit.refill-tokens=5",
        "app.ratelimit.refill-period-seconds=60"
})
class RateLimitIT {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void requestsBeyondCapacityGet429WithRetryAfter() throws Exception {
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(get("/api/v1/commands"))
                    .andExpect(status().isOk())
                    .andExpect(header().exists("X-RateLimit-Remaining"));
        }

        MvcResult overLimit = mockMvc.perform(get("/api/v1/commands"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.status").value(429))
                .andReturn();

        long retryAfter = Long.parseLong(overLimit.getResponse().getHeader("Retry-After"));
        assertThat(retryAfter).isBetween(1L, 61L);
    }

    @Test
    void differentClientIpsHaveIndependentBuckets() throws Exception {
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(get("/api/v1/workflows").header("X-Forwarded-For", "10.1.1.1"))
                    .andExpect(status().isOk());
        }
        mockMvc.perform(get("/api/v1/workflows").header("X-Forwarded-For", "10.1.1.1"))
                .andExpect(status().isTooManyRequests());

        // A different client is unaffected
        mockMvc.perform(get("/api/v1/workflows").header("X-Forwarded-For", "10.2.2.2"))
                .andExpect(status().isOk());
    }

    @Test
    void actuatorHealthIsNeverRateLimited() throws Exception {
        for (int i = 0; i < 10; i++) {
            mockMvc.perform(get("/actuator/health").header("X-Forwarded-For", "10.3.3.3"))
                    .andExpect(status().isOk());
        }
    }

    @Test
    void rateLimited429CarriesCorsHeaderForAllowedOrigin() throws Exception {
        String origin = "http://localhost:5173"; // allowed by the test profile
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(get("/api/v1/commands").header("Origin", origin).header("X-Forwarded-For", "10.4.4.4"))
                    .andExpect(status().isOk());
        }
        // The filter runs before Spring Security, so it must add the CORS header itself
        // or the browser would block the 429 as a CORS error.
        mockMvc.perform(get("/api/v1/commands").header("Origin", origin).header("X-Forwarded-For", "10.4.4.4"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Access-Control-Allow-Origin", origin));
    }

    @Test
    void rateLimited429OmitsCorsHeaderForDisallowedOrigin() throws Exception {
        // Drain the bucket with plain requests (no Origin → 200), then hit the empty
        // bucket from a disallowed origin: the 429 must not leak an allow-origin header.
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(get("/api/v1/commands").header("X-Forwarded-For", "10.5.5.5"))
                    .andExpect(status().isOk());
        }
        mockMvc.perform(get("/api/v1/commands").header("Origin", "https://evil.example.com").header("X-Forwarded-For", "10.5.5.5"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }
}
