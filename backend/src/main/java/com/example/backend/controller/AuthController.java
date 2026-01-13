package com.example.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder; // Cần import cái này
import org.springframework.web.bind.annotation.*;

import com.example.backend.entity.user.User;
import com.example.backend.repository.user.UserRepository;
import com.example.backend.security.JwtUtils;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/auth")
@CrossOrigin("*") // Cho phép Frontend/Swagger gọi thoải mái
public class AuthController {

    private final UserRepository userRepository;
    private final JwtUtils jwtUtils;
    private final AuthenticationManager authenticationManager;
    private final PasswordEncoder passwordEncoder; // Inject thêm PasswordEncoder

    public AuthController(UserRepository userRepository, JwtUtils jwtUtils,
            AuthenticationManager authenticationManager, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.jwtUtils = jwtUtils;
        this.authenticationManager = authenticationManager;
        this.passwordEncoder = passwordEncoder;
    }

    // 1. API Đăng ký (Đã PUBLIC lên Swagger)
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest req) {
        try {
            // Kiểm tra tên đăng nhập đã tồn tại chưa
            if (userRepository.existsByUsername(req.getUsername())) {
                return ResponseEntity.badRequest().body("Lỗi: Tên đăng nhập đã tồn tại!");
            }

            // Tạo User mới
            User user = new User();
            user.setUsername(req.getUsername());
            user.setFullName(req.getFullName()); // Thêm họ tên
            user.setPassword(passwordEncoder.encode(req.getPassword())); // Mã hóa mật khẩu
            user.setRole("user"); // Mặc định quyền là user

            userRepository.save(user);

            return ResponseEntity.ok("Đăng ký thành công!");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi đăng ký: " + e.getMessage());
        }
    }

    // 2. API Đăng nhập cho FRONTEND (User & Admin đều dùng được)
    @PostMapping("/login")
    public ResponseEntity<?> loginForFrontend(@RequestBody LoginRequest req) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(req.getUsername(), req.getPassword()));

            if (authentication.isAuthenticated()) {
                String token = jwtUtils.generateToken(req.getUsername());
                // Trả về JSON để Frontend dễ lấy
                Map<String, String> response = new HashMap<>();
                response.put("token", token);
                response.put("username", req.getUsername());
                return ResponseEntity.ok(response);
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Sai tài khoản hoặc mật khẩu");
        }
        return ResponseEntity.badRequest().body("Đăng nhập thất bại");
    }

    // 3. API Đăng nhập dành riêng cho ADMIN (Check quyền chặt chẽ)
    @PostMapping("/admin-login")
    public ResponseEntity<?> loginForSwagger(@RequestBody LoginRequest req) {
        try {
            // Bước 1: Xác thực tài khoản/mật khẩu
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(req.getUsername(), req.getPassword()));

            if (authentication.isAuthenticated()) {
                // Bước 2: Check xem có phải Admin không
                User user = userRepository.findByUsername(req.getUsername())
                        .orElseThrow(() -> new RuntimeException("User không tồn tại"));

                if (!"admin".equals(user.getRole())) {
                    return ResponseEntity.status(403).body("Truy cập bị từ chối! Chỉ Admin mới được vào.");
                }

                String token = jwtUtils.generateToken(req.getUsername());
                Map<String, String> response = new HashMap<>();
                response.put("token", token);
                return ResponseEntity.ok(response);
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi: " + e.getMessage());
        }
        return ResponseEntity.badRequest().body("Thất bại");
    }
}

// ================= DTO CLASS =================

class LoginRequest {
    private String username;
    private String password;

    // Getter & Setter
    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}

class RegisterRequest {
    private String fullName; // Thêm trường này cho đầy đủ
    private String username;
    private String password;

    // Getter & Setter
    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}