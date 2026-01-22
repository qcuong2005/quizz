package com.example.backend.dto.chat;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class ChatMessageDTO {
    private String sender; // Tên người gửi (Username)
    private String content; // Nội dung tin nhắn
    private String timestamp; // Thời gian gửi

    // Constructor rỗng
    public ChatMessageDTO() {
    }

    public ChatMessageDTO(String sender, String content) {
        this.sender = sender;
        this.content = content;
        // Tự động lấy giờ hiện tại
        this.timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss"));
    }

    // Getters & Setters
    public String getSender() {
        return sender;
    }

    public void setSender(String sender) {
        this.sender = sender;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }
}