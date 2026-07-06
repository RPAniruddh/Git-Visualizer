package com.gitvisualizer.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.List;

/**
 * A guided multi-command lesson path, seeded from git-commands-content.json.
 */
@Entity
@Table(name = "workflows")
public class WorkflowEntity {

    @Id
    @Column(length = 64)
    private String id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, length = 512)
    private String description;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "steps")
    private List<String> steps;

    @Column(name = "note", length = 1024)
    private String note;

    protected WorkflowEntity() {
        // for JPA
    }

    public WorkflowEntity(String id, String title, String description, List<String> steps, String note) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.steps = steps;
        this.note = note;
    }

    public String getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public List<String> getSteps() {
        return steps;
    }

    public String getNote() {
        return note;
    }
}
