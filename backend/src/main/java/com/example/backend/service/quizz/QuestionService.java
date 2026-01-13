package com.example.backend.service.quizz;

import java.util.List;

import org.springframework.stereotype.Service;

import com.example.backend.entity.quizz.Question;
import com.example.backend.repository.quizz.QuestionRepository;
import com.example.backend.service.geminiService.GeminiService;
import com.google.gson.Gson;

@Service
public class QuestionService {

    private final GeminiService geminiService;
    private final QuestionRepository questionRepository;

    public QuestionService(GeminiService geminiService, QuestionRepository questionRepository) {
        this.geminiService = geminiService;
        this.questionRepository = questionRepository;
    }

    public Question generateAndSaveQuestion(String topic) {
        // 1. Gọi AI để lấy chuỗi JSON thô
        String jsonResult = geminiService.generateQuizQuestion(topic);

        // 2. Parse JSON sang Object Java để lấy dữ liệu
        Gson gson = new Gson();
        try {
            // Chuyển chuỗi JSON từ AI thành đối tượng tạm
            GeminiResponseDto dto = gson.fromJson(jsonResult, GeminiResponseDto.class);

            // 3. Map dữ liệu sang Entity Question để lưu DB
            Question question = new Question();
            question.setTopic(topic);
            question.setContent(dto.question);
            question.setCorrectAnswer(dto.correctAnswer);

            // Xử lý mảng options ["A. abc", "B. xyz"...]
            if (dto.options != null && dto.options.size() >= 4) {
                question.setOptionA(dto.options.get(0));
                question.setOptionB(dto.options.get(1));
                question.setOptionC(dto.options.get(2));
                question.setOptionD(dto.options.get(3));
            }

            // 4. Lưu xuống Database
            return questionRepository.save(question);

        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Lỗi khi xử lý dữ liệu từ AI: " + e.getMessage());
        }
    }

    // Class nội bộ để hứng dữ liệu JSON từ AI (DTO)
    private static class GeminiResponseDto {
        String question;
        List<String> options;
        String correctAnswer;
    }
}