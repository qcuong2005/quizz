package com.example.backend.controller.room;

import java.security.Principal;

import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.entity.room.Room;
import com.example.backend.service.room.RoomService;

@RestController
@RequestMapping("/api/rooms")
@CrossOrigin("*")
public class RoomController {

    private final RoomService roomService;
    private final SimpMessagingTemplate messagingTemplate; // WebSocket

    public RoomController(RoomService roomService, SimpMessagingTemplate messagingTemplate) {
        this.roomService = roomService;
        this.messagingTemplate = messagingTemplate;
    }

    // SỬA: Nhận thêm int capacity
    @PostMapping("/create")
    public ResponseEntity<?> createRoom(
            @RequestParam String roomName,
            @RequestParam int capacity,
            Principal principal) {

        if (principal == null)
            return ResponseEntity.status(403).body("Chưa đăng nhập!");

        // Validate cơ bản
        if (capacity < 2 || capacity > 4) {
            return ResponseEntity.badRequest().body("Số lượng người chơi chỉ từ 2 đến 4!");
        }

        try {
            Room room = roomService.createRoom(roomName, capacity, principal.getName());
            return ResponseEntity.ok(room);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // API join giữ nguyên...
    @PostMapping("/join")
    public ResponseEntity<?> joinRoom(@RequestParam String roomId, Principal principal) {
        if (principal == null)
            return ResponseEntity.status(403).body("Chưa đăng nhập!");
        try {
            Room room = roomService.joinRoom(roomId, principal.getName());
            messagingTemplate.convertAndSend("/topic/room/" + roomId, room);
            return ResponseEntity.ok(room);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}