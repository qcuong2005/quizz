package com.example.backend.service.room;

import java.util.Random;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.backend.dto.room.AddCustomQuestionsRequest;
import com.example.backend.dto.room.RoomQuestionDTO;
import com.example.backend.entity.room.Room;
import com.example.backend.repository.room.RoomRepository;

@Service
public class RoomService {

    private final RoomRepository roomRepository;
    private final Random random = new Random();

    // Constructor Injection (Best Practice)
    public RoomService(RoomRepository roomRepository) {
        this.roomRepository = roomRepository;
    }

    /**
     * 1. TẠO PHÒNG MỚI
     * - Sinh mã phòng ngẫu nhiên (4 chữ số).
     * - Lưu thông tin chủ phòng (Host).
     */
    @Transactional
    public Room createRoom(String roomName, int capacity, String hostUsername) {
        String roomId = generateRoomId();

        // Đảm bảo mã phòng không bị trùng trong DB
        while (roomRepository.existsById(roomId)) {
            roomId = generateRoomId();
        }

        // Tạo Entity Room mới
        Room newRoom = new Room(roomId, roomName, capacity, hostUsername);

        // Khởi tạo danh sách (nếu Entity chưa khởi tạo trong Constructor)
        // newRoom.setPlayers(new ArrayList<>());
        // newRoom.addPlayer(hostUsername); // Chủ phòng tự động là người chơi đầu tiên

        return roomRepository.save(newRoom);
    }

    /**
     * 2. NGƯỜI DÙNG TỰ THÊM BỘ CÂU HỎI (CUSTOM QUESTIONS)
     * - Nhận list câu hỏi từ Client.
     * - Map sang RoomQuestionDTO.
     * - Lưu vào Room.
     */
    @Transactional
    public Room addCustomQuestionsToRoom(AddCustomQuestionsRequest request, String username) {
        // a. Tìm phòng
        Room room = roomRepository.findById(request.getRoomId())
                .orElseThrow(() -> new RuntimeException("Phòng không tồn tại với ID: " + request.getRoomId()));

        // b. Kiểm tra quyền chủ phòng (Mở comment nếu muốn chặn người lạ đặt câu hỏi)
        /*
         * if (!room.getHost().equals(username)) {
         * throw new
         * RuntimeException("Chỉ chủ phòng mới được quyền thay đổi bộ câu hỏi!");
         * }
         */

        // c. Xóa câu hỏi cũ để dùng bộ mới (Tuỳ chọn logic game)
        if (room.getQuestions() != null && !room.getQuestions().isEmpty()) {
            room.getQuestions().clear();
        }

        // d. Convert từ Request DTO sang RoomQuestionDTO (Entity Support)
        if (request.getQuestions() != null) {
            for (AddCustomQuestionsRequest.CustomQuestionItem item : request.getQuestions()) {
                RoomQuestionDTO questionDTO = new RoomQuestionDTO();

                questionDTO.setContent(item.getContent());
                questionDTO.setOptionA(item.getOptionA());
                questionDTO.setOptionB(item.getOptionB());
                questionDTO.setOptionC(item.getOptionC());
                questionDTO.setOptionD(item.getOptionD());
                questionDTO.setCorrectAnswer(item.getCorrectAnswer()); // Ví dụ: "A", "B"...
                questionDTO.setType("MANUAL"); // Đánh dấu là câu hỏi người dùng tạo

                room.getQuestions().add(questionDTO);
            }
        }

        // e. Lưu lại Room với danh sách câu hỏi mới
        return roomRepository.save(room);
    }

    /**
     * 3. THAM GIA PHÒNG (PLAYER)
     * - Kiểm tra phòng tồn tại.
     * - Kiểm tra phòng đầy.
     * - Thêm user vào danh sách players.
     */
    @Transactional
    public Room joinRoom(String roomId, String username) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Mã phòng không tồn tại!"));

        // Nếu user đã có trong phòng rồi thì trả về luôn (Reconnect)
        if (room.getPlayers().contains(username)) {
            return room;
        }

        // Kiểm tra sức chứa
        if (room.getPlayers().size() >= room.getCapacity()) {
            throw new RuntimeException("Phòng đã đầy (" + room.getPlayers().size() + "/" + room.getCapacity() + ")!");
        }

        // Thêm người chơi
        room.addPlayer(username);

        return roomRepository.save(room);
    }

    /**
     * 4. THAM GIA XEM (SPECTATOR)
     * - Không giới hạn số lượng (hoặc tuỳ chỉnh).
     * - Không tính vào danh sách Player chính.
     */
    @Transactional
    public Room joinRoomAsSpectator(String roomId, String username) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Mã phòng không tồn tại!"));

        // Nếu user đang là người chơi chính thì không add vào spectator
        if (room.getPlayers().contains(username)) {
            return room;
        }

        // Nếu chưa xem thì add vào list khán giả
        if (!room.getSpectators().contains(username)) {
            room.addSpectator(username);
            return roomRepository.save(room);
        }

        return room;
    }

    /**
     * 5. LẤY THÔNG TIN PHÒNG (Helper)
     */
    public Room getRoomById(String roomId) {
        return roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phòng: " + roomId));
    }

    // --- Private Helper Methods ---

    // Tạo ID ngẫu nhiên từ 1000 -> 9999
    private String generateRoomId() {
        return String.valueOf(1000 + random.nextInt(9000));
    }
}