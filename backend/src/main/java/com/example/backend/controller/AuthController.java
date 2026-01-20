package com.example.backend.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.entity.user.User;
import com.example.backend.repository.user.UserRepository;
import com.example.backend.security.JwtUtils;

@RestController
@RequestMapping("/auth")
@CrossOrigin("*")
public class AuthController {

    private final UserRepository userRepository;
    private final JwtUtils jwtUtils;
    private final AuthenticationManager authenticationManager;
    private final PasswordEncoder passwordEncoder;

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
                Map<String, Object> response = new HashMap<>(); // Change String to Object to handle numbers
                response.put("token", token);
                response.put("username", req.getUsername());

                // Fetch full user to get stats
                User user = userRepository.findByUsername(req.getUsername()).orElse(null);
                if (user != null) {
                    response.put("id", user.getId()); // Add ID for WebSocket topic
                    response.put("totalScore", user.getTotalScore());
                    response.put("streak", user.getStreak());
                    response.put("gamesPlayed", user.getGamesPlayed());
                    // Calculate mock rank based on score or just a simple logic
                    long score = user.getTotalScore();
                    String rank = "Học viên";
                    if (score > 5000)
                        rank = "Bậc thầy";
                    else if (score > 2000)
                        rank = "Chuyên gia";
                    else if (score > 500)
                        rank = "Ưu tú";
                    response.put("rankName", rank);

                    // Calculate Real Rank (Position in Leaderboard)
                    long rankPosition = userRepository.countByTotalScoreGreaterThan(user.getTotalScore()) + 1;
                    response.put("rank", rankPosition);
                }

                return ResponseEntity.ok(response);
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Sai tài khoản hoặc mật khẩu");
        }
        return ResponseEntity.badRequest().body("Đăng nhập thất bại");
    }

    // 4. API lấy thông tin người dùng hiện tại (Frontend dùng sau khi login)
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@RequestHeader("Authorization") String authHeader) {
        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(401).body("Thiếu hoặc sai định dạng token");
            }

            // 1️⃣ Tách token ra khỏi header
            String token = authHeader.substring(7);

            // 2️⃣ Giải mã token để lấy username
            String username = jwtUtils.extractUsername(token);
            if (username == null) {
                return ResponseEntity.status(401).body("Token không hợp lệ");
            }

            // 3️⃣ Tìm user trong DB
            User user = userRepository.findByUsername(username).orElse(null);
            if (user == null) {
                return ResponseEntity.status(404).body("User không tồn tại");
            }

            // 4️⃣ Chuẩn bị dữ liệu trả về
            Map<String, Object> response = new HashMap<>();
            response.put("id", user.getId()); // Add ID
            response.put("username", user.getUsername());
            response.put("fullName", user.getFullName());
            response.put("role", user.getRole());
            response.put("totalScore", user.getTotalScore());
            response.put("streak", user.getStreak());
            response.put("gamesPlayed", user.getGamesPlayed());

            // RankName (theo logic của bạn)
            long score = user.getTotalScore();
            String rank = "Học viên";
            if (score > 5000)
                rank = "Bậc thầy";
            else if (score > 2000)
                rank = "Chuyên gia";
            else if (score > 500)
                rank = "Ưu tú";
            response.put("rankName", rank);

            // Rank thật (vị trí trong leaderboard)
            long rankPosition = userRepository.countByTotalScoreGreaterThan(user.getTotalScore()) + 1;
            response.put("rank", rankPosition);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(500).body("Lỗi khi lấy thông tin user: " + e.getMessage());
        }
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