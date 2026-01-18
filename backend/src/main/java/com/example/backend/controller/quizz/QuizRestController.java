package com.example.backend.controller.quizz;

import java.security.Principal;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.entity.quizz.Question;
import com.example.backend.entity.user.User;
import com.example.backend.repository.user.UserRepository;
import com.example.backend.service.geminiService.GeminiService;
import com.example.backend.service.quizz.QuestionService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;

@RestController
@RequestMapping("/api/quiz")
@CrossOrigin("*")
@SecurityRequirement(name = "Bearer Authentication") // Yêu cầu Token
public class QuizRestController {

    private final QuestionService questionService; // Dùng để Lưu DB
    private final GeminiService geminiService; // Dùng để Test nhanh AI (Bỏ qua DB)
    private final UserRepository userRepository; // Dùng để cộng điểm cho User

    // Danh sách chủ đề hợp lệ
    private final List<String> VALID_TOPICS = Arrays.asList(
            "Toán", "Văn", "Sử", "Địa", "Tiếng Anh", "Đố vui", "Đố mẹo", "Đố dân gian");

    // Inject cả 3 thành phần vào (QuestionService, GeminiService, UserRepository)
    public QuizRestController(QuestionService questionService,
            GeminiService geminiService,
            UserRepository userRepository) {
        this.questionService = questionService;
        this.geminiService = geminiService;
        this.userRepository = userRepository;
    }

    // --- API 1: LUỒNG CHÍNH (Sinh AI -> Lưu DB -> Trả về) ---
    @Operation(summary = "1. Sinh câu hỏi & Lưu Database", description = "Gọi AI, lưu vào bảng 'questions' và trả về object Question hoàn chỉnh.")
    @GetMapping("/generate")
    public ResponseEntity<?> generateAndSave(
            @Parameter(description = "Chủ đề", example = "Sử") @RequestParam String topic,
            Principal principal) {

        if (principal == null)
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Chưa đăng nhập!");

        if (!isValidTopic(topic)) {
            return ResponseEntity.badRequest().body("Chủ đề không hợp lệ! Các chủ đề: " + VALID_TOPICS);
        }

        try {
            // Gọi Service chuẩn (Có lưu DB)
            Question savedQuestion = questionService.generateAndSaveQuestion(topic);
            return ResponseEntity.ok(savedQuestion);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Lỗi Server: " + e.getMessage());
        }
    }

    // --- API 2: LUỒNG TEST NHANH (Chỉ gọi AI, KHÔNG Lưu DB) ---
    @Operation(summary = "2. Test nhanh Gemini (Không lưu DB)", description = "API này chỉ để test xem AI trả lời gì.")
    @GetMapping("/test-gemini")
    public ResponseEntity<?> testGeminiOnly(
            @Parameter(description = "Chủ đề", example = "Toán") @RequestParam String topic,
            Principal principal) {

        if (principal == null)
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Chưa đăng nhập!");

        System.out.println("Test nhanh AI với chủ đề: " + topic);
        try {
            // Gọi trực tiếp GeminiService (Bỏ qua bước lưu DB)
            // Lưu ý: Đảm bảo GeminiService trả về Map hoặc String JSON
            var result = geminiService.generateQuizQuestion(topic);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi Gemini: " + e.getMessage());
        }
    }

    // --- API 3: KIỂM TRA ĐÁP ÁN & TÍNH ĐIỂM ---
    @Operation(summary = "3. Kiểm tra đáp án & Tính điểm", description = "So sánh đáp án, tính điểm dựa trên thời gian và cộng vào tài khoản User.")
    @PostMapping("/check-answer")
    public ResponseEntity<?> checkAnswer(@RequestBody CheckAnswerRequest request, Principal principal) {
        // 1. Kiểm tra đăng nhập
        if (principal == null)
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Chưa đăng nhập!");

        // 2. Validate dữ liệu đầu vào
        if (request.getUserAnswer() == null || request.getCorrectAnswer() == null) {
            return ResponseEntity.badRequest().body("Thiếu dữ liệu đáp án!");
        }

        // 3. So sánh đáp án (Không phân biệt hoa thường)
        boolean isCorrect = request.getUserAnswer().trim().equalsIgnoreCase(request.getCorrectAnswer().trim());

        int pointsEarned = 0;

        // 4. Logic Tính Điểm (Nếu đúng)
        if (isCorrect) {
            int timeTaken = request.getTimeTakenSeconds();
            int baseScore = 100; // Điểm gốc
            int penalty = timeTaken * 5; // Trừ 5 điểm mỗi giây trôi qua

            // Công thức: Max(10, 100 - thời gian * 5) -> Thấp nhất vẫn được 10 điểm
            pointsEarned = Math.max(10, baseScore - penalty);

            // 5. Cộng điểm vào Database User
            String username = principal.getName();
            User user = userRepository.findByUsername(username).orElse(null);

            if (user != null) {
                user.setTotalScore(user.getTotalScore() + pointsEarned);
                userRepository.save(user); // Lưu lại điểm mới
            }
        }

        // 6. Trả về kết quả
        return ResponseEntity.ok(Map.of(
                "status", isCorrect ? "CORRECT" : "WRONG",
                "message", isCorrect
                        ? "Chính xác! +" + pointsEarned + " điểm (Thời gian: " + request.getTimeTakenSeconds() + "s)"
                        : "Sai rồi! Đáp án đúng là: " + request.getCorrectAnswer(),
                "score_added", pointsEarned,
                "current_total_score", 0 // Bạn có thể query lại user.getTotalScore() nếu muốn hiển thị luôn
        ));
    }

    // Hàm phụ check chủ đề
    private boolean isValidTopic(String topic) {
        return VALID_TOPICS.stream().anyMatch(t -> t.equalsIgnoreCase(topic));
    }
}

// ================= DTO CLASS =================
class CheckAnswerRequest {
    private String userAnswer;
    private String correctAnswer;
    private int timeTakenSeconds; // Thời gian trả lời (tính bằng giây)

    // Getters & Setters
    public String getUserAnswer() {
        return userAnswer;
    }

    public void setUserAnswer(String userAnswer) {
        this.userAnswer = userAnswer;
    }

    public String getCorrectAnswer() {
        return correctAnswer;
    }

    public void setCorrectAnswer(String correctAnswer) {
        this.correctAnswer = correctAnswer;
    }

    public int getTimeTakenSeconds() {
        return timeTakenSeconds;
    }

    public void setTimeTakenSeconds(int timeTakenSeconds) {
        this.timeTakenSeconds = timeTakenSeconds;
    }
}