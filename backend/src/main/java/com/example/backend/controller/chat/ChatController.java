package com.example.backend.controller.chat;

import com.example.backend.entity.chat.ChatMessage;
import com.example.backend.entity.user.User;
import com.example.backend.repository.user.UserRepository;
import com.example.backend.security.JwtUtils;
import com.example.backend.service.chat.ChatService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
@CrossOrigin("*")
public class ChatController {

    private final ChatService chatService;
    private final JwtUtils jwtUtils;
    private final UserRepository userRepository;

    public ChatController(ChatService chatService, JwtUtils jwtUtils, UserRepository userRepository) {
        this.chatService = chatService;
        this.jwtUtils = jwtUtils;
        this.userRepository = userRepository;
    }

    private Long getUserIdFromToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new RuntimeException("Invalid authorization header");
        }
        String token = authHeader.substring(7);
        String username = jwtUtils.extractUsername(token);
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return user.getId();
    }

    @GetMapping("/{friendId}")
    public ResponseEntity<List<ChatMessage>> getChatHistory(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long friendId) {
        Long senderId = getUserIdFromToken(authHeader);
        return ResponseEntity.ok(chatService.findChatMessages(senderId, friendId));
    }
}
