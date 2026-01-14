package com.example.backend.entity.quizz;

import jakarta.persistence.Column;
import jakarta.persistence.Entity; // Nếu bạn dùng Lombok, không thì tự viết Getter/Setter
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "questions")
@Data // Tự sinh Getter/Setter
public class Question {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String topic; // Chủ đề (Toán, Lý...)

    @Column(columnDefinition = "TEXT")
    private String content; // Nội dung câu hỏi

    private String optionA;
    private String optionB;
    private String optionC;
    private String optionD;

    private String correctAnswer; // "A", "B", "C" hoặc "D"

    @Column(columnDefinition = "TEXT")
    private String explanation; // Giải thích đáp án
}