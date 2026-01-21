package com.example.backend.repository.forum;

import com.example.backend.entity.forum.ForumComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ForumCommentRepository extends JpaRepository<ForumComment, Long> {
    // Get all comments for a specific post, ordered by creation time
    List<ForumComment> findByPostIdOrderByCreatedAtAsc(Long postId);
}
