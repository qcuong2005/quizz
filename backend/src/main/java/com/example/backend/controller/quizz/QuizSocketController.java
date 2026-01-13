package com.example.backend.controller.quizz;

import com.example.backend.service.geminiService.GeminiService;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;
import java.security.Principal; // Import cái này

@Controller
public class QuizSocketController {

    private final GeminiService geminiService;

    public QuizSocketController(GeminiService geminiService) {
        this.geminiService = geminiService;
    }

    @MessageMapping("/get-question")
    @SendTo("/topic/quiz")
    public String getQuestion(String topic, Principal principal) {
        // Principal chứa thông tin người dùng đã qua bước kiểm tra Token
        System.out.println("User " + principal.getName() + " đang yêu cầu câu hỏi về: " + topic);

        return geminiService.generateQuizQuestion(topic);
    }

    @MessageMapping("/check-answer")
    @SendTo("/topic/score")
    public String checkAnswer(String jsonMessage, Principal principal) {
        // Lấy tên user từ Token (An toàn tuyệt đối, không fake được)
        String currentUsername = principal.getName();

        Gson gson = new Gson();
        JsonObject input = gson.fromJson(jsonMessage, JsonObject.class);

        String userAns = input.get("userAnswer").getAsString();
        String correctAns = input.get("correctAnswer").getAsString();

        if (userAns.equalsIgnoreCase(correctAns)) {
            // Logic cộng điểm cho currentUsername vào DB...
            return "{\"username\": \"" + currentUsername + "\", \"message\": \"Đúng! +10 điểm\", \"score\": 10}";
        } else {
            return "{\"username\": \"" + currentUsername + "\", \"message\": \"Sai rồi!\", \"score\": 0}";
        }
    }
}