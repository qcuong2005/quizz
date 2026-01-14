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

    // Danh sách chủ đề
    private final List<String> VALID_TOPICS = Arrays.asList(
            "Toán", "Văn", "Sử", "Địa", "Tiếng Anh", "Đố vui", "Đố mẹo", "Đố dân gian");

    // Inject cả 2 Service vào
    public QuizRestController(QuestionService questionService, GeminiService geminiService) {
        this.questionService = questionService;
        this.geminiService = geminiService;
    }

    // --- API 1: LUỒNG CHÍNH (Sinh AI -> Lưu DB -> Trả về) ---
    @Operation(summary = "1. Sinh câu hỏi & Lưu Database (Dùng cho App thật)", description = "Gọi AI, lưu vào bảng 'questions' và trả về object Question hoàn chỉnh.")
    @GetMapping("/generate")
    public ResponseEntity<?> generateAndSave(
            @Parameter(description = "Chủ đề", example = "Sử") @RequestParam String topic,
            Principal principal) {

        if (principal == null)
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Chưa đăng nhập!");
        if (!isValidTopic(topic))
            return ResponseEntity.badRequest().body("Chủ đề không hợp lệ!");

        try {
            // Gọi Service chuẩn (Có lưu DB)
            Question savedQuestion = questionService.generateAndSaveQuestion(topic);
            return ResponseEntity.ok(savedQuestion);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi Lưu DB: " + e.getMessage());
        }
    }

    // --- API 2: LUỒNG TEST NHANH (Chỉ gọi AI, KHÔNG Lưu DB) ---
    @Operation(summary = "2. Test nhanh Gemini (Không lưu DB)", description = "API này chỉ để test xem AI trả lời gì, giúp debug nhanh lỗi logic của AI.")
    @GetMapping("/test-gemini")
    public ResponseEntity<?> testGeminiOnly(
            @Parameter(description = "Chủ đề", example = "Toán") @RequestParam String topic,
            Principal principal) {

        // (Có thể bỏ check login nếu muốn test tự do, ở đây tôi giữ lại cho an toàn)
        if (principal == null)
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Chưa đăng nhập!");

        System.out.println("Test nhanh AI với chủ đề: " + topic);
        try {
            // Gọi trực tiếp GeminiService (Bỏ qua bước lưu DB)
            Map<String, Object> result = geminiService.generateQuizQuestion(topic);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi Gemini: " + e.getMessage());
        }
    }

    // --- API 3: KIỂM TRA ĐÁP ÁN ---
    @Operation(summary = "3. Kiểm tra đáp án", description = "So sánh đáp án User chọn vs Đáp án đúng.")
    @PostMapping("/check-answer")
    public ResponseEntity<?> checkAnswer(@RequestBody CheckAnswerRequest request, Principal principal) {
        if (principal == null)
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Chưa đăng nhập!");

        if (request.getUserAnswer() == null || request.getCorrectAnswer() == null) {
            return ResponseEntity.badRequest().body("Thiếu dữ liệu đáp án!");
        }

        boolean isCorrect = request.getUserAnswer().trim().equalsIgnoreCase(request.getCorrectAnswer().trim());

        return ResponseEntity.ok(Map.of(
                "status", isCorrect ? "CORRECT" : "WRONG",
                "message", isCorrect ? "Chính xác! +10 điểm" : "Sai rồi!",
                "score_added", isCorrect ? 10 : 0));
    }

    // Hàm phụ check chủ đề
    private boolean isValidTopic(String topic) {
        return VALID_TOPICS.stream().anyMatch(t -> t.equalsIgnoreCase(topic));
    }
}

// DTO Class
class CheckAnswerRequest {
    private String userAnswer;
    private String correctAnswer;

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
}