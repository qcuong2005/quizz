package com.example.backend.dto.room;

import java.util.List;

public class AddCustomQuestionsRequest {

    private String roomId;
    private List<CustomQuestionItem> questions;

    // 1. Constructor mặc định (Bắt buộc)
    public AddCustomQuestionsRequest() {
    }

    // 2. Getters & Setters
    public String getRoomId() {
        return roomId;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public List<CustomQuestionItem> getQuestions() {
        return questions;
    }

    public void setQuestions(List<CustomQuestionItem> questions) {
        this.questions = questions;
    }

    // 3. Class con (BẮT BUỘC PHẢI LÀ STATIC)
    public static class CustomQuestionItem {
        private String content;
        private String optionA;
        private String optionB;
        private String optionC;
        private String optionD;
        private String correctAnswer;

        public CustomQuestionItem() {
        }

        // Getters & Setters đầy đủ
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
    }
}