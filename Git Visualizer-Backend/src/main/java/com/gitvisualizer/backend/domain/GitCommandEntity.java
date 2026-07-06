package com.gitvisualizer.backend.domain;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.List;

/**
 * A single git command explanation, seeded from git-commands-content.json.
 * beforeGraph/afterGraph are opaque JSON structures owned by the frontend's
 * visualization design — stored as JSON/JSONB without assuming their shape.
 */
@Entity
@Table(name = "git_commands")
public class GitCommandEntity {

    @Id
    @Column(length = 64)
    private String id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, length = 64)
    private String category;

    @Column(name = "short_explanation", nullable = false, length = 512)
    private String shortExplanation;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "syntax")
    private List<String> syntax;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "hints")
    private List<String> hints;

    @Column(name = "how_it_works", nullable = false, length = 4000)
    private String howItWorks;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "before_graph")
    private JsonNode beforeGraph;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "after_graph")
    private JsonNode afterGraph;

    // Which demo repository the frontend sandbox seeds for this command
    @Column(name = "sandbox_seed", length = 64)
    private String sandboxSeed;

    protected GitCommandEntity() {
        // for JPA
    }

    public GitCommandEntity(String id, String title, String category, String shortExplanation,
                            List<String> syntax, List<String> hints, String howItWorks,
                            JsonNode beforeGraph, JsonNode afterGraph, String sandboxSeed) {
        this.id = id;
        this.title = title;
        this.category = category;
        this.shortExplanation = shortExplanation;
        this.syntax = syntax;
        this.hints = hints;
        this.howItWorks = howItWorks;
        this.beforeGraph = beforeGraph;
        this.afterGraph = afterGraph;
        this.sandboxSeed = sandboxSeed;
    }

    public String getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getCategory() {
        return category;
    }

    public String getShortExplanation() {
        return shortExplanation;
    }

    public List<String> getSyntax() {
        return syntax;
    }

    public List<String> getHints() {
        return hints;
    }

    public String getHowItWorks() {
        return howItWorks;
    }

    public JsonNode getBeforeGraph() {
        return beforeGraph;
    }

    public JsonNode getAfterGraph() {
        return afterGraph;
    }

    public String getSandboxSeed() {
        return sandboxSeed;
    }
}
