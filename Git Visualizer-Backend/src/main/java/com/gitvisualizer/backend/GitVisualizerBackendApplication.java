package com.gitvisualizer.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class GitVisualizerBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(GitVisualizerBackendApplication.class, args);
    }
}
