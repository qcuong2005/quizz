package com.example.backend.service.chat;

import com.example.backend.entity.chat.ChatMessage;
import com.example.backend.repository.chat.ChatMessageRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ChatService {
    private final ChatMessageRepository repository;

    public ChatService(ChatMessageRepository repository) {
        this.repository = repository;
    }

    public ChatMessage save(ChatMessage chatMessage) {
        chatMessage.setStatus(ChatMessage.MessageStatus.SENT);
        return repository.save(chatMessage);
    }

    public List<ChatMessage> findChatMessages(Long senderId, Long receiverId) {
        return repository.findBySenderIdAndReceiverIdOrSenderIdAndReceiverIdOrderByTimestampAsc(
                senderId, receiverId, receiverId, senderId);
    }
}
