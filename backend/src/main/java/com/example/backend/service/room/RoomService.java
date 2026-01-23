package com.example.backend.service.room;

import java.util.Random;

import org.springframework.stereotype.Service; // Import Repository
import org.springframework.transaction.annotation.Transactional;

import com.example.backend.entity.room.Room;
import com.example.backend.entity.room.RoomStatus;
import com.example.backend.repository.room.RoomRepository;

@Service
@Transactional
public class RoomService {

    private final RoomRepository roomRepository; // Inject Repository
    private final Random random = new Random();

    public RoomService(RoomRepository roomRepository) {
        this.roomRepository = roomRepository;
    }

    // 1. Tạo phòng và lưu xuống DB
    public Room createRoom(String roomName, int capacity, String hostUsername, int maxQuestions) {
        String roomId = generateRoomId();

        // Đảm bảo mã không trùng trong DB
        while (roomRepository.existsById(roomId)) {
            roomId = generateRoomId();
        }

        Room newRoom = new Room(roomId, roomName, capacity, hostUsername, maxQuestions);

        // LƯU XUỐNG DB
        return roomRepository.saveAndFlush(newRoom);
    }

    // 2. Vào phòng (Lấy từ DB -> Sửa -> Lưu lại)
    public Room joinRoom(String roomId, String username) {
        // Tìm phòng trong DB
        Room room = roomRepository.findByIdWithPlayers(roomId)
                .orElseThrow(() -> new RuntimeException("Mã phòng không tồn tại!"));

        // Check room status
        if (room.getStatus() == RoomStatus.CANCELLED) {
            throw new RuntimeException("Phòng này đã bị hủy!");
        }
        if (room.getStatus() == RoomStatus.FINISHED) {
            throw new RuntimeException("Phòng này đã kết thúc!");
        }

        // Logic check full
        if (!room.getPlayers().contains(username)) {
            if (room.getPlayers().size() >= room.getCapacity()) {
                throw new RuntimeException("Phòng đã đầy (" + room.getCapacity() + " người)!");
            }

            // Thêm người chơi
            room.addPlayer(username);

            // LƯU CẬP NHẬT XUỐNG DB
            return roomRepository.saveAndFlush(room);
        }

        return room;
    }

    private String generateRoomId() {
        return String.valueOf(1000 + random.nextInt(9000));
    }

    // 3. Vào xem (Khán giả)
    public Room joinRoomAsSpectator(String roomId, String username) {
        Room room = roomRepository.findByIdWithPlayers(roomId)
                .orElseThrow(() -> new RuntimeException("Mã phòng không tồn tại!"));

        // Check if user is already a player
        if (room.getPlayers().contains(username)) {
            // If playing, just return room
            return room;
        }

        if (room.getStatus() == RoomStatus.CANCELLED) {
            throw new RuntimeException("Phòng này đã bị hủy!");
        }

        if (!room.getSpectators().contains(username)) {
            room.addSpectator(username);
            return roomRepository.save(room);
        }

        return room;
    }

    public Room getRoomById(String roomId) {
        return roomRepository.findByIdWithPlayers(roomId)
                .orElseThrow(() -> new RuntimeException("Mã phòng không tồn tại!"));
    }

    public void cancelRoom(String roomId) {
        Room room = getRoomById(roomId);
        room.setStatus(RoomStatus.CANCELLED);
        roomRepository.saveAndFlush(room);
    }

    public void finishRoom(String roomId) {
        Room room = getRoomById(roomId);
        room.setStatus(RoomStatus.FINISHED);
        roomRepository.saveAndFlush(room);
    }
}