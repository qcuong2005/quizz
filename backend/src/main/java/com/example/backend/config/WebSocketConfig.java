package com.example.backend.config;

import com.example.backend.security.JwtUtils;
import com.example.backend.security.UserInfoService;
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

@Configuration
@EnableWebSocketMessageBroker
@Order(Ordered.HIGHEST_PRECEDENCE + 99) // Chạy sau các filter bảo mật hệ thống
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtUtils jwtUtils;
    private final UserInfoService userInfoService;

    // Inject 2 cái này để kiểm tra Token và load User
    public WebSocketConfig(JwtUtils jwtUtils, UserInfoService userInfoService) {
        this.jwtUtils = jwtUtils;
        this.userInfoService = userInfoService;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws-quiz").setAllowedOriginPatterns("*").withSockJS();
    }

    // --- PHẦN QUAN TRỌNG: BỘ LỌC KIỂM TRA ĐĂNG NHẬP ---
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

                // Chỉ kiểm tra khi client gửi lệnh CONNECT
                if (StompCommand.CONNECT.equals(accessor.getCommand())) {

                    // 1. Lấy header "Authorization" từ gói tin
                    String authHeader = accessor.getFirstNativeHeader("Authorization");

                    if (authHeader != null && authHeader.startsWith("Bearer ")) {
                        String token = authHeader.substring(7);
                        try {
                            // 2. Validate Token
                            if (jwtUtils.validateToken(token)) {
                                String username = jwtUtils.extractUsername(token);
                                UserDetails userDetails = userInfoService.loadUserByUsername(username);

                                // 3. Tạo đối tượng Authentication
                                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                                        userDetails, null, userDetails.getAuthorities());

                                // 4. Gán User vào phiên làm việc của Socket
                                accessor.setUser(auth);
                                return message; // Cho phép đi tiếp
                            }
                        } catch (Exception e) {
                            // Lỗi Token
                        }
                    }
                    // Nếu không có Token hoặc Token sai -> Ném lỗi (Client sẽ bị ngắt kết nối)
                    throw new RuntimeException("Bạn chưa đăng nhập! Vui lòng đăng nhập để làm bài test.");
                }
                return message;
            }
        });
    }
}