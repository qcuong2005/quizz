package com.example.backend.repository.room;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.backend.entity.room.Room;
import java.util.Optional;

@Repository
public interface RoomRepository extends JpaRepository<Room, String> {

    @Query("SELECT r FROM Room r LEFT JOIN FETCH r.players WHERE r.roomId = :roomId")
    Optional<Room> findByIdWithPlayers(@Param("roomId") String roomId);
}