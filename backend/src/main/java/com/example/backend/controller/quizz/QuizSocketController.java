package com.example.backend.controller.quizz;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;
import java.security.Principal; // Import cái này

@Controller
public class QuizSocketController {

    private final com.example.backend.service.quizz.QuestionService questionService;
    private final com.example.backend.repository.user.UserRepository userRepository;

    public QuizSocketController(com.example.backend.service.quizz.QuestionService questionService,
            com.example.backend.repository.user.UserRepository userRepository) {
        this.questionService = questionService;
        this.userRepository = userRepository;
    }

    @MessageMapping("/get-question")
    @SendTo("/topic/quiz")
    public java.util.Map<String, Object> getQuestion(String topic, Principal principal) {
        System.out.println("User " + principal.getName() + " đang yêu cầu câu hỏi về: " + topic);

        // Gọi qua Service có Cache (DB)
        com.example.backend.entity.quizz.Question q = questionService.getOrGenerateQuestion(topic);

        // Convert Entity -> Map để trả về Frontend đúng format cũ
        java.util.Map<String, Object> response = new java.util.HashMap<>();
        response.put("question", q.getContent());
        response.put("topic", q.getTopic());
        response.put("correctAnswer", q.getCorrectAnswer());
        response.put("id", q.getId());

        java.util.List<String> options = new java.util.ArrayList<>();
        if (q.getOptionA() != null)
            options.add(q.getOptionA());
        if (q.getOptionB() != null)
            options.add(q.getOptionB());
        if (q.getOptionC() != null)
            options.add(q.getOptionC());
        if (q.getOptionD() != null)
            options.add(q.getOptionD());
        response.put("options", options);

        // Thêm giải thích đáp án
        if (q.getExplanation() != null) {
            response.put("explanation", q.getExplanation());
        }

        return response;
    }

    // Lưu trữ Streak tạm thời (In-memory) - Reset khi server restart
    private static final java.util.Map<String, Integer> userStreaks = new java.util.concurrent.ConcurrentHashMap<>();

    @MessageMapping("/check-answer")
    @SendTo("/topic/score")
    public java.util.Map<String, Object> checkAnswer(String jsonMessage, Principal principal) {
        String currentUsername = principal.getName();
        Gson gson = new Gson();
        JsonObject input = gson.fromJson(jsonMessage, JsonObject.class);

        String userAns = input.get("userAnswer").getAsString();
        String correctAns = input.get("correctAnswer").getAsString();
        // Mặc định 0 nếu không gửi lên
        int timeLeft = input.has("timeLeft") ? input.get("timeLeft").getAsInt() : 0;

        java.util.Map<String, Object> response = new java.util.HashMap<>();
        response.put("username", currentUsername);

        if (userAns.equalsIgnoreCase(correctAns)) {
            // 1. Tính điểm: 100 cơ bản + (thời gian còn lại * 5)
            int score = 100 + (timeLeft * 5);

            // 2. Xử lý Streak
            int currentStreak = userStreaks.getOrDefault(currentUsername, 0) + 1;
            userStreaks.put(currentUsername, currentStreak);

            // Bonus Streak: 3 câu +50, 5 câu +100
            int streakBonus = 0;
            if (currentStreak >= 5)
                streakBonus = 100;
            else if (currentStreak >= 3)
                streakBonus = 50;

            score += streakBonus;

            response.put("status", "CORRECT");
            response.put("message", "Chính xác! +" + score + " điểm");
            response.put("score", score);
            response.put("streak", currentStreak);
            response.put("streakBonus", streakBonus);

        } else {
            // Sai thì reset streak
            userStreaks.put(currentUsername, 0);

            response.put("status", "WRONG");
            response.put("message", "Sai rồi! Mất chuỗi thắng.");
            response.put("score", 0);
            response.put("streak", 0);
            response.put("streakBonus", 0);
        }

        // --- NEW: Save Stats to Database ---
        try {
            com.example.backend.entity.user.User user = userRepository.findByUsername(currentUsername).orElse(null);
            if (user != null) {
                // Update Total Score from this turn
                long earnedScore = (response.get("score") instanceof Integer)
                        ? ((Integer) response.get("score")).longValue()
                        : 0L;
                user.setTotalScore(user.getTotalScore() + earnedScore);

                // Update Streak (Max streak logic vs Current streak?)
                // Assuming "streak" field in DB is Current Streak
                int currentStreak = userStreaks.getOrDefault(currentUsername, 0);
                user.setStreak(currentStreak);

                // Update Games Played (increment by 1 for every answer check? Or every session?
                // Let's count every Question answered as a "play" or "turn". Usually specific
                // "Games" are sessions.
                // For now, let's just increment Total Answers = Games Played in this simple
                // context, or maybe just leave it
                // Actually, let's just increment it.
                user.setGamesPlayed(user.getGamesPlayed() + 1);

                userRepository.save(user); // Persist to DB
            }
        } catch (Exception e) {
            System.err.println("Lỗi lưu stats: " + e.getMessage());
        }
        // -----------------------------------

        return response;
    }
}