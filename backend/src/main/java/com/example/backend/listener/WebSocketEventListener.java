package com.example.backend.listener;

import java.security.Principal;

import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import com.example.backend.repository.user.UserRepository;

@Component
public class WebSocketEventListener {

    private final UserRepository userRepository;
    private final com.example.backend.repository.user.FriendshipRepository friendshipRepository;
    private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    public WebSocketEventListener(UserRepository userRepository,
            com.example.backend.repository.user.FriendshipRepository friendshipRepository,
            org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate) {
        this.userRepository = userRepository;
        this.friendshipRepository = friendshipRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal userPrincipal = headerAccessor.getUser();

        if (userPrincipal != null) {
            String username = userPrincipal.getName();
            updateUserStatus(username, true);
        }
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal userPrincipal = headerAccessor.getUser();

        if (userPrincipal != null) {
            String username = userPrincipal.getName();
            updateUserStatus(username, false);
        }
    }

    private void updateUserStatus(String username, boolean isOnline) {
        userRepository.findByUsername(username).ifPresent(user -> {
            user.setOnline(isOnline);
            userRepository.save(user);

            // BROADCAST STATUS TO FRIENDS
            broadcastStatusToFriends(user.getId(), username, isOnline);
        });
    }

    private void broadcastStatusToFriends(Long userId, String username, boolean isOnline) {
        java.util.List<com.example.backend.entity.user.Friendship> friendships = friendshipRepository
                .findAllByUserId(userId);

        java.util.Map<String, Object> statusMessage = new java.util.HashMap<>();
        statusMessage.put("type", "USER_STATUS");
        statusMessage.put("username", username);
        statusMessage.put("online", isOnline);

        for (com.example.backend.entity.user.Friendship f : friendships) {
            Long friendId = (f.getUserId().equals(userId)) ? f.getFriendId() : f.getUserId();
            userRepository.findById(friendId).ifPresent(friend -> {
                messagingTemplate.convertAndSendToUser(friend.getUsername(), "/queue/messages", statusMessage);
            });
        }
    }
}
