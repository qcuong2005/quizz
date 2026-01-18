package com.example.backend.repository.user;

import com.example.backend.entity.user.ScoreHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScoreHistoryRepository extends JpaRepository<ScoreHistory, Long> {
    List<ScoreHistory> findByUserIdOrderByCreatedAtDesc(Long userId);
}
