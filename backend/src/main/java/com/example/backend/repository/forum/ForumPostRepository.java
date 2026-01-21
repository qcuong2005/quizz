package com.example.backend.repository.forum;

import com.example.backend.entity.forum.ForumPost;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ForumPostRepository extends JpaRepository<ForumPost, Long> {
    // Find all posts by category (for filtering)
    Page<ForumPost> findByCategoryId(Long categoryId, Pageable pageable);

    // Find posts by user (for profile)
    List<ForumPost> findByAuthorId(Long userId);

    // Search by title (basic search)
    Page<ForumPost> findByTitleContainingIgnoreCase(String title, Pageable pageable);
}
