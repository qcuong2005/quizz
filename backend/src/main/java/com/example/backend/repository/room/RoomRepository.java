package com.example.backend.repository.room;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.backend.entity.room.Room;

@Repository
public interface RoomRepository extends JpaRepository<Room, String> {
    // JpaRepository đã có sẵn hàm save(), findById(), existsById()...
    // Không cần viết gì thêm
}