package com.gitvisualizer.backend.repository;

import com.gitvisualizer.backend.domain.WorkflowEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkflowRepository extends JpaRepository<WorkflowEntity, String> {
}
