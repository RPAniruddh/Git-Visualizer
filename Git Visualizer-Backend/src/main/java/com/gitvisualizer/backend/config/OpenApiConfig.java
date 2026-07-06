package com.gitvisualizer.backend.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI gitVisualizerOpenApi() {
        return new OpenAPI().info(new Info()
                .title("Git Visualizer Content API")
                .description("Serves git command explanations, hints, workflow lessons and "
                        + "visualization graph data to the Git Visualizer React frontend. "
                        + "Read-only public API; command simulation happens client-side.")
                .version("v1"));
    }
}
