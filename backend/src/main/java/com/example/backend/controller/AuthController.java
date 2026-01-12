package com.example.backend.controller;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.entity.user.User;
import com.example.backend.repository.user.UserRepository;
import com.example.backend.security.JwtUtils;

import io.swagger.v3.oas.annotations.Hidden;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final JwtUtils jwtUtils;
    private final AuthenticationManager authenticationManager;

    public AuthController(UserRepository userRepository, JwtUtils jwtUtils,
            AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.jwtUtils = jwtUtils;
        this.authenticationManager = authenticationManager;
    }

    // 1. API Đăng ký (Ẩn khỏi Swagger cho gọn, User thường đăng ký ở Frontend)
    @Hidden
    @PostMapping("/register")
    public String register(@RequestBody RegisterRequest req) {
        // ... (Giữ nguyên code đăng ký của bạn nếu cần, hoặc để trống)
        return "Đăng ký thành công";
    }

    // 2. API Đăng nhập cho FRONTEND (User thường & Admin đều dùng được)
    // Dùng annotation @Hidden để ẨN API này khỏi Swagger
    // -> Để người dùng trên Swagger không bấm nhầm vào cái này
    @Hidden
    @PostMapping("/login")
    public String loginForFrontend(@RequestBody LoginRequest req) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(req.getUsername(), req.getPassword()));
            if (authentication.isAuthenticated()) {
                return jwtUtils.generateToken(req.getUsername());
            }
        } catch (Exception e) {
            throw new RuntimeException("Sai tài khoản hoặc mật khẩu");
        }
        return "Thất bại";
    }

    // 3. API Đăng nhập dành riêng cho SWAGGER (Chỉ hiện cái này trên Swagger)
    // Tên đường dẫn khác đi một chút để phân biệt
    @PostMapping("/admin-login")
    public String loginForSwagger(@RequestBody LoginRequest req) {
        try {
            // Bước 1: Xác thực tài khoản/mật khẩu
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(req.getUsername(), req.getPassword()));

            if (authentication.isAuthenticated()) {
                // Bước 2: Lấy thông tin user từ DB để CHECK QUYỀN
                User user = userRepository.findByUsername(req.getUsername())
                        .orElseThrow(() -> new RuntimeException("User không tồn tại"));

                // --- ĐOẠN QUAN TRỌNG NHẤT: CHẶN USER THƯỜNG ---
                if (!"admin".equals(user.getRole())) {
                    throw new RuntimeException("Truy cập bị từ chối! Chỉ Admin mới được đăng nhập ở đây.");
                }
                // -----------------------------------------------

                // Nếu là Admin thì trả về Token
                return jwtUtils.generateToken(req.getUsername());
            }
        } catch (Exception e) {
            // Ném lỗi ra để Swagger hiện thông báo đỏ
            throw new RuntimeException(e.getMessage());
        }
        return "Thất bại";
    }
}

// Giữ nguyên các class LoginRequest, RegisterRequest ở dưới...
class LoginRequest {
    private String username;
    private String password;

    public String getUsername() {
        return username;
    }

    public String getPassword() {
        return password;
    }
}

class RegisterRequest {
    private String username;
    private String password;

    public String getUsername() {
        return username;
    }

    public String getPassword() {
        return password;
    }
}