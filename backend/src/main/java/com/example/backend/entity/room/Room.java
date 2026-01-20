package com.example.backend.entity.room;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import com.example.backend.dto.room.RoomQuestionDTO; // Import DTO

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;

@Entity
@Table(name = "rooms")
public class Room {

    @Id
    private String roomId;

    private String roomName;
    private int capacity;
    private String host;

    // --- PLAYERS ---
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "room_players", joinColumns = @JoinColumn(name = "room_id"))
    @Column(name = "player_username")
    private Set<String> players = new HashSet<>();

    // --- SPECTATORS ---
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "room_spectators", joinColumns = @JoinColumn(name = "room_id"))
    @Column(name = "spectator_username")
    private Set<String> spectators = new HashSet<>();

    // --- QUESTIONS (THÊM ĐOẠN NÀY) ---
    // Lưu danh sách câu hỏi. "RoomQuestionDTO" phải có @Embeddable
    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "room_questions", joinColumns = @JoinColumn(name = "room_id"))
    private List<RoomQuestionDTO> questions = new ArrayList<>(); // Khởi tạo ngay để không bị Null

    // --- Constructor ---
    public Room() {
    }

    public Room(String roomId, String roomName, int capacity, String host) {
        this.roomId = roomId;
        this.roomName = roomName;
        this.capacity = capacity;
        this.host = host;
        this.players.add(host);
    }

    // --- Helper Methods ---
    public void addPlayer(String username) {
        this.players.add(username);
    }

    public void addSpectator(String username) {
        this.spectators.add(username);
    }

    // --- Getters & Setters ---
    public String getRoomId() {
        return roomId;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public String getRoomName() {
        return roomName;
    }

    public void setRoomName(String roomName) {
        this.roomName = roomName;
    }

    public int getCapacity() {
        return capacity;
    }

    public void setCapacity(int capacity) {
        this.capacity = capacity;
    }

    public String getHost() {
        return host;
    }

    public void setHost(String host) {
        this.host = host;
    }

    public Set<String> getPlayers() {
        return players;
    }

    public void setPlayers(Set<String> players) {
        this.players = players;
    }

    public Set<String> getSpectators() {
        return spectators;
    }

    public void setSpectators(Set<String> spectators) {
        this.spectators = spectators;
    }

    // GETTER & SETTER CHO QUESTIONS (BẮT BUỘC)
    public List<RoomQuestionDTO> getQuestions() {
        return questions;
    }

    public void setQuestions(List<RoomQuestionDTO> questions) {
        this.questions = questions;
    }
}