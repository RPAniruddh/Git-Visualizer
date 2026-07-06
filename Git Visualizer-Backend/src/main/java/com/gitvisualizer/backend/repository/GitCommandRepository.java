package com.gitvisualizer.backend.repository;

import com.gitvisualizer.backend.domain.GitCommandEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GitCommandRepository extends JpaRepository<GitCommandEntity, String> {

    List<GitCommandEntity> findAllByCategoryIgnoreCase(String category);
}
