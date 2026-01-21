package com.example.backend.controller.chat;

import com.example.backend.entity.chat.ChatMessage;
import com.example.backend.service.chat.ChatService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;
import java.util.Map;

import com.example.backend.repository.user.UserRepository;
import com.example.backend.entity.user.User;

@Controller
public class ChatWebSocketController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ChatService chatService;
    private final UserRepository userRepository;

    public ChatWebSocketController(SimpMessagingTemplate messagingTemplate, ChatService chatService,
            UserRepository userRepository) {
        this.messagingTemplate = messagingTemplate;
        this.chatService = chatService;
        this.userRepository = userRepository;
    }

    @MessageMapping("/chat")
    public void processMessage(@Payload ChatMessage chatMessage) {
        chatMessage.setTimestamp(LocalDateTime.now());
        ChatMessage saved = chatService.save(chatMessage);

        // Find receiver's username to send to their specific queue
        String receiverUsername = userRepository.findById(chatMessage.getReceiverId())
                .map(User::getUsername)
                .orElse(String.valueOf(chatMessage.getReceiverId()));

        // Send to receiver
        messagingTemplate.convertAndSendToUser(
                receiverUsername,
                "/queue/messages",
                saved);
    }

    @MessageMapping("/typing")
    public void handleTyping(@Payload Map<String, Object> payload) {
        Long senderId = Long.valueOf(payload.get("senderId").toString());
        Long receiverId = Long.valueOf(payload.get("receiverId").toString());
        Boolean isTyping = (Boolean) payload.get("isTyping");

        // Find receiver's username
        String receiverUsername = userRepository.findById(receiverId)
                .map(User::getUsername)
                .orElse(String.valueOf(receiverId));

        // Send typing status to receiver
        messagingTemplate.convertAndSendToUser(
                receiverUsername,
                "/queue/typing",
                Map.of("senderId", senderId, "isTyping", isTyping));
    }
}
