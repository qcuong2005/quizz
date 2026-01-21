package com.example.backend.repository.chat;

import com.example.backend.entity.chat.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    // Find conversation between two users
    List<ChatMessage> findBySenderIdAndReceiverIdOrSenderIdAndReceiverIdOrderByTimestampAsc(
            Long senderId1, Long receiverId1, Long senderId2, Long receiverId2);

    // Count unread messages for a recipient from a specific sender
    long countBySenderIdAndReceiverIdAndStatus(Long senderId, Long receiverId, ChatMessage.MessageStatus status);
}
