package com.example.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.example.backend.security.JwtAuthFilter;
import com.example.backend.security.UserInfoService;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final UserInfoService userInfoService;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter, UserInfoService userInfoService) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.userInfoService = userInfoService;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource())) // Kích hoạt CORS config
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                        // 1. Cho phép truy cập Login, Register VÀ Trang giao diện Swagger
                        .requestMatchers("/auth/**").permitAll() // Cho phép truy cập API auth
                        .requestMatchers("/v3/api-docs/**").permitAll()
                        .requestMatchers("/auth/**", "/api/auth/**", "/ws/**").permitAll()
                        .requestMatchers("/swagger-ui/**").permitAll()
                        .requestMatchers("/swagger-ui.html").permitAll()
                        .requestMatchers("/ws-quiz/**").permitAll() // Cho phép truy cập WebSocket
                        .requestMatchers("/api/rankings/**").permitAll() // ✅ Cho phép xem BXH công khai
                        .requestMatchers("/api/rooms/join-spectator").permitAll() // ✅ Cho phép Khán giả vào xem không
                                                                                  // cần Login
                        .requestMatchers("/uploads/**").permitAll() // ✅ Cho phép truy cập file đã upload
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/forum/**").permitAll() // ✅ Cho
                                                                                                               // phép
                                                                                                               // xem
                                                                                                               // Forum
                                                                                                               // công
                                                                                                               // khai

                        // 2. Các API khác vẫn cần đăng nhập mới gọi được
                        .anyRequest().authenticated())
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // Cấu hình CORS để cho phép Frontend (localhost:3000) gọi xuống
    @Bean
    public org.springframework.web.cors.CorsConfigurationSource corsConfigurationSource() {
        org.springframework.web.cors.CorsConfiguration configuration = new org.springframework.web.cors.CorsConfiguration();
        configuration.setAllowedOriginPatterns(java.util.List.of("*")); // Chỉ cho phép domain này
        configuration.setAllowedMethods(java.util.List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(java.util.List.of("*"));
        configuration.setAllowCredentials(true);

        org.springframework.web.cors.UrlBasedCorsConfigurationSource source = new org.springframework.web.cors.UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    // Mã hóa mật khẩu (Để không lưu password thô trong DB)
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    @SuppressWarnings("deprecation")
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userInfoService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}