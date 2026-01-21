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

    public WebSocketEventListener(UserRepository userRepository) {
        this.userRepository = userRepository;
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
            // System.out.println("User " + username + " is now " + (isOnline ? "ONLINE" :
            // "OFFLINE"));
        });
    }
}
