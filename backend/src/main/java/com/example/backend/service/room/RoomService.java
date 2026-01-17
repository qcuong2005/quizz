package com.example.backend.service.room;

import java.util.Random;

import org.springframework.stereotype.Service; // Import Repository

import com.example.backend.entity.room.Room;
import com.example.backend.repository.room.RoomRepository;

@Service
public class RoomService {

    private final RoomRepository roomRepository; // Inject Repository
    private final Random random = new Random();

    public RoomService(RoomRepository roomRepository) {
        this.roomRepository = roomRepository;
    }

    // 1. Tạo phòng và lưu xuống DB
    public Room createRoom(String roomName, int capacity, String hostUsername) {
        String roomId = generateRoomId();

        // Đảm bảo mã không trùng trong DB
        while (roomRepository.existsById(roomId)) {
            roomId = generateRoomId();
        }

        Room newRoom = new Room(roomId, roomName, capacity, hostUsername);

        // LƯU XUỐNG DB
        return roomRepository.save(newRoom);
    }

    // 2. Vào phòng (Lấy từ DB -> Sửa -> Lưu lại)
    public Room joinRoom(String roomId, String username) {
        // Tìm phòng trong DB
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Mã phòng không tồn tại!"));

        // Logic check full
        if (!room.getPlayers().contains(username)) {
            if (room.getPlayers().size() >= room.getCapacity()) {
                throw new RuntimeException("Phòng đã đầy (" + room.getCapacity() + " người)!");
            }

            // Thêm người chơi
            room.addPlayer(username);

            // LƯU CẬP NHẬT XUỐNG DB
            return roomRepository.save(room);
        }

        return room;
    }

    private String generateRoomId() {
        return String.valueOf(1000 + random.nextInt(9000));
    }
}   