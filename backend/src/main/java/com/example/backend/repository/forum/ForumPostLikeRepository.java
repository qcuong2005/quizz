package com.example.backend.repository.forum;

import com.example.backend.entity.forum.ForumPostLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ForumPostLikeRepository extends JpaRepository<ForumPostLike, Long> {
    // Check if user already liked a post
    Optional<ForumPostLike> findByPostIdAndUserId(Long postId, Long userId);

    // Check existence
    boolean existsByPostIdAndUserId(Long postId, Long userId);

    // Count likes for a post (optional, if we don't rely on the counter in Post
    // entity)
    long countByPostId(Long postId);
}
