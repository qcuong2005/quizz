package com.example.backend.entity.user;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "score_history")
public class ScoreHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private int score;

    @Column(nullable = false)
    private String mode; // "SINGLE" or "MULTI"

    private String roomId; // Optional, mainly for MULTI

    private LocalDateTime createdAt;

    public ScoreHistory() {
        this.createdAt = LocalDateTime.now();
    }

    public ScoreHistory(User user, int score, String mode, String roomId) {
        this.user = user;
        this.score = score;
        this.mode = mode;
        this.roomId = roomId;
        this.createdAt = LocalDateTime.now();
    }

    // Getters and Setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public int getScore() {
        return score;
    }

    public void setScore(int score) {
        this.score = score;
    }

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public String getRoomId() {
        return roomId;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
