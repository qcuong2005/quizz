package com.example.backend.config;

import java.util.Arrays;
import java.util.List;

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
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

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
                // 1. KÍCH HOẠT CORS (QUAN TRỌNG NHẤT ĐỂ FIX LỖI FAILED TO FETCH)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // 2. Tắt CSRF (Do dùng Token nên không cần)
                .csrf(AbstractHttpConfigurer::disable)

                // 3. Phân quyền
                .authorizeHttpRequests(auth -> auth
                        // Cho phép truy cập tự do vào các API này (Login, Register, Swagger)
                        .requestMatchers(
                                "/auth/**", // Auth Controller
                                "/api/auth/**", // Phòng hờ nếu bạn đổi đường dẫn
                                "/v3/api-docs/**", // Swagger JSON
                                "/swagger-ui/**", // Swagger UI Assets
                                "/swagger-ui.html" // Swagger Index
                        ).permitAll()

                        // Các API khác bắt buộc phải có Token
                        .anyRequest().authenticated())

                // 4. Cấu hình Provider và Filter
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // --- CẤU HÌNH CHI TIẾT CORS (MỞ CỬA CHO TẤT CẢ) ---
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Cho phép mọi nguồn (Frontend từ 5500, 3000,...)
        configuration.setAllowedOrigins(List.of("*"));

        // Cho phép mọi phương thức (GET, POST, PUT, DELETE, OPTIONS)
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));

        // Cho phép mọi Header (Authorization, Content-Type...)
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "x-auth-token"));

        // Đăng ký cấu hình này cho mọi đường dẫn (/**)
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    // --- CÁC BEAN CŨ GIỮ NGUYÊN ---

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
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