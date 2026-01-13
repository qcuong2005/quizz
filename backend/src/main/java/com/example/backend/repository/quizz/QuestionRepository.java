package com.example.backend.repository.quizz;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.backend.entity.quizz.Question;

@Repository
public interface QuestionRepository extends JpaRepository<Question, Long> {
    // Sau này có thể thêm hàm tìm kiếm theo chủ đề
    // List<Question> findByTopic(String topic);
}