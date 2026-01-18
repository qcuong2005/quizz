package com.example.backend.repository.user;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.backend.entity.user.User;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);

    boolean existsByUsername(String username);

    long countByTotalScoreGreaterThan(long totalScore);

    List<User> findTop10ByOrderByTotalScoreDesc();
}