package com.example.backend.repository.quizz;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.backend.entity.quizz.Question;

@Repository
public interface QuestionRepository extends JpaRepository<Question, Long> {
    @org.springframework.data.jpa.repository.Query(value = "SELECT * FROM questions WHERE topic = :topic ORDER BY RAND() LIMIT 1", nativeQuery = true)
    java.util.Optional<Question> findRandomQuestionByTopic(
            @org.springframework.data.repository.query.Param("topic") String topic);
}