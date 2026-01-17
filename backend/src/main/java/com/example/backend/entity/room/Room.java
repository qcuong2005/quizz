package com.example.backend.entity.room;

import java.util.HashSet;
import java.util.Set;

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
    private String roomId; // Mã phòng (Khóa chính)

    private String roomName;
    private int capacity;
    private String host;

    // Lưu danh sách người chơi (Hibernate sẽ tạo bảng phụ room_players)
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "room_players", joinColumns = @JoinColumn(name = "room_id"))
    @Column(name = "player_username")
    private Set<String> players = new HashSet<>();

    // 1. Constructor mặc định (Bắt buộc cho JPA)
    public Room() {
    }

    // 2. Constructor dùng để tạo mới
    public Room(String roomId, String roomName, int capacity, String host) {
        this.roomId = roomId;
        this.roomName = roomName;
        this.capacity = capacity;
        this.host = host;
        this.players.add(host);
    }

    // Logic thêm người chơi
    public void addPlayer(String username) {
        this.players.add(username);
    }

    // Getters & Setters
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
}