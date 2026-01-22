package com.example.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import com.example.backend.security.JwtUtils;
import com.example.backend.security.UserInfoService;

@Configuration
@EnableWebSocketMessageBroker
@Order(Ordered.HIGHEST_PRECEDENCE + 99) // Ưu tiên chạy sau các cấu hình bảo mật cốt lõi
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtUtils jwtUtils;
    private final UserInfoService userInfoService;

    // Inject các service cần thiết để validate Token
    public WebSocketConfig(JwtUtils jwtUtils, UserInfoService userInfoService) {
        this.jwtUtils = jwtUtils;
        this.userInfoService = userInfoService;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Kích hoạt các kênh topic (public) và queue (private)
        config.enableSimpleBroker("/topic", "/queue");
        // Tiền tố cho các message từ Client gửi lên Server
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Endpoint chính để JS kết nối vào
        registry.addEndpoint("/ws-quiz")
                .setAllowedOriginPatterns("*") // Cho phép mọi nguồn (Dev mode)
                .withSockJS(); // Hỗ trợ fallback SockJS
    }

    // --- BỘ LỌC KIỂM TRA ĐĂNG NHẬP (Intercept CONNECT) ---
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

                // Chỉ kiểm tra khi Client gửi lệnh CONNECT
if (StompCommand.CONNECT.equals(accessor.getCommand())) {

                    // 1. Lấy header "Authorization" từ gói tin STOMP
                    String authHeader = accessor.getFirstNativeHeader("Authorization");

                    if (authHeader != null && authHeader.startsWith("Bearer ")) {
                        String token = authHeader.substring(7);
                        try {
                            // 2. Validate Token
                            if (jwtUtils.validateToken(token)) {
                                String username = jwtUtils.extractUsername(token);

                                // Load thông tin User từ DB
                                UserDetails userDetails = userInfoService.loadUserByUsername(username);

                                // 3. Tạo Authentication Token
                                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                                        userDetails, null, userDetails.getAuthorities());

                                // 4. Gán User vào phiên WebSocket
                                accessor.setUser(auth);

                                System.out.println("✅ WebSocket Auth: User " + username + " connected.");
                            }
                        } catch (Exception e) {
                            System.err.println("❌ WebSocket Auth Error: Token không hợp lệ. Kết nối như Guest.");
                        }
                    } else {
                        System.out.println("⚠️ WebSocket: Không có Token. Kết nối như Guest (Khán giả).");
                    }
                }

                // Luôn return message để cho phép kết nối (kể cả Guest)
                return message;
            }
        });
    }
}