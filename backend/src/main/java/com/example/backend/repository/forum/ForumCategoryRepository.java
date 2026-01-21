package com.example.backend.repository.forum;

import com.example.backend.entity.forum.ForumCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ForumCategoryRepository extends JpaRepository<ForumCategory, Long> {
    Optional<String> findByName(String name);
}
