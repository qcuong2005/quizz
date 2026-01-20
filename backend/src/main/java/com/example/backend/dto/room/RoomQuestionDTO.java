package com.example.backend.dto.room;

import jakarta.persistence.Embeddable;

@Embeddable
public class RoomQuestionDTO {
    private String content; // Nội dung câu hỏi
    private String optionA;
    private String optionB;
    private String optionC;
    private String optionD;
    private String correctAnswer; // Ví dụ: "A" hoặc "A. Nội dung..."
    private String type; // "AI_GENERATED" hoặc "MANUAL"

    // Constructor rỗng
    public RoomQuestionDTO() {
    }

    // Constructor đầy đủ
    public RoomQuestionDTO(String content, String optionA, String optionB, String optionC, String optionD,
            String correctAnswer, String type) {
        this.content = content;
        this.optionA = optionA;
        this.optionB = optionB;
        this.optionC = optionC;
        this.optionD = optionD;
        this.correctAnswer = correctAnswer;
        this.type = type;
    }

    // --- Getters & Setters ---
    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getOptionA() {
        return optionA;
    }

    public void setOptionA(String optionA) {
        this.optionA = optionA;
    }

    public String getOptionB() {
        return optionB;
    }

    public void setOptionB(String optionB) {
        this.optionB = optionB;
    }

    public String getOptionC() {
        return optionC;
    }

    public void setOptionC(String optionC) {
        this.optionC = optionC;
    }

    public String getOptionD() {
        return optionD;
    }

    public void setOptionD(String optionD) {
        this.optionD = optionD;
    }

    public String getCorrectAnswer() {
        return correctAnswer;
    }

    public void setCorrectAnswer(String correctAnswer) {
        this.correctAnswer = correctAnswer;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }
}