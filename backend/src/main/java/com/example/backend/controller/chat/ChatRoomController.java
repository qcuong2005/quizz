package com.example.backend.controller.chat;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.CrossOrigin;

import com.example.backend.dto.chat.ChatMessageDTO;

@Controller
@CrossOrigin("*")
public class ChatRoomController {

    private final SimpMessagingTemplate messagingTemplate;

    public ChatRoomController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Hứng tin nhắn từ Client gửi lên: /app/chat/{roomId}/sendMessage
     * Sau đó bắn về cho tất cả người trong phòng: /topic/chat/{roomId}
     */
    @MessageMapping("/chat/{roomId}/sendMessage")
    public void sendMessage(
            @DestinationVariable String roomId, 
            @Payload ChatMessageDTO chatMessage) {
        
        // 1. (Tuỳ chọn) Có thể lưu tin nhắn vào Database ở đây nếu muốn lịch sử chat
        
        // 2. Gán lại thời gian server (để đảm bảo đồng bộ)
        ChatMessageDTO response = new ChatMessageDTO(chatMessage.getSender(), chatMessage.getContent());
        
        System.out.println("Chat Room [" + roomId + "] - " + response.getSender() + ": " + response.getContent());

        // 3. Gửi tin nhắn đến tất cả user đang subscribe room này
        messagingTemplate.convertAndSend("/topic/chat/" + roomId, response);
    }
}