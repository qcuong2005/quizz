package com.example.backend.controller.quizz;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import java.security.Principal;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Controller
public class QuizSocketController {

    private final com.example.backend.service.quizz.QuestionService questionService;
    private final com.example.backend.repository.user.UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    // Defines the current question for each room to ensure sync
    // roomId -> Map<QuestionData>
    private static final Map<String, com.example.backend.entity.quizz.Question> roomCurrentQuestion = new ConcurrentHashMap<>();

    // Store scores for the room: roomId -> (username -> score)
    private static final Map<String, Map<String, Integer>> roomScores = new ConcurrentHashMap<>();

    // Keep userStreaks for single player (or global streaks)
    private static final Map<String, Integer> userStreaks = new ConcurrentHashMap<>();

    public QuizSocketController(com.example.backend.service.quizz.QuestionService questionService,
            com.example.backend.repository.user.UserRepository userRepository,
            SimpMessagingTemplate messagingTemplate) {
        this.questionService = questionService;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
    }

    // --- SINGLE PLAYER (Legacy) ---
    @MessageMapping("/get-question")
    @SendTo("/topic/quiz")
    public Map<String, Object> getQuestion(String topic, Principal principal) {
        // ...
        return fetchQuestionData(topic);
    }

    // --- MULTIPLAYER ROOMS ---

    // 1. Start Game / Next Question
    @MessageMapping("/room/{roomId}/start")
    public void startRoomGame(@DestinationVariable String roomId, String topic) {
        System.out.println("Room " + roomId + " starting game with topic: " + topic);

        // Broadcast "Game Started" signal to move everyone to Quiz Page
        messagingTemplate.convertAndSend("/topic/room/" + roomId,
                Map.of("type", "GAME_START", "roomId", roomId, "topic", topic));

        // Immediately send the first question after a short delay
        try {
            Thread.sleep(2000);
        } catch (InterruptedException e) {
        }
        sendNextQuestionToRoom(roomId, topic);
    }

    @MessageMapping("/room/{roomId}/next-question")
    public void nextQuestion(@DestinationVariable String roomId, String topic) {
        sendNextQuestionToRoom(roomId, topic);
    }

    private void sendNextQuestionToRoom(String roomId, String topic) {
        com.example.backend.entity.quizz.Question q = questionService.getOrGenerateQuestion(topic);
        roomCurrentQuestion.put(roomId, q);

        // Convert to response map
        Map<String, Object> response = new java.util.HashMap<>();
        response.put("type", "NEW_QUESTION");
        response.put("question", q.getContent());
        response.put("topic", q.getTopic());
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
        // Do NOT send correct answer yet!

        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/game", response);
    }

    // 2. Submit Answer (Multiplayer)
    @MessageMapping("/room/{roomId}/submit")
    public void submitRoomAnswer(@DestinationVariable String roomId, String jsonMessage, Principal principal) {
        String username = principal.getName();
        Gson gson = new Gson();
        JsonObject input = gson.fromJson(jsonMessage, JsonObject.class);
        String userAns = input.get("userAnswer").getAsString();

        // Check verification against current room question
        com.example.backend.entity.quizz.Question currentQ = roomCurrentQuestion.get(roomId);
        if (currentQ == null)
            return;

        boolean isCorrect = userAns.equalsIgnoreCase(currentQ.getCorrectAnswer());
        int score = 0;
        if (isCorrect) {
            int timeLeft = input.has("timeLeft") ? input.get("timeLeft").getAsInt() : 0;
            score = 100 + (timeLeft * 5);
        }

        // Update Room Score
        roomScores.putIfAbsent(roomId, new ConcurrentHashMap<>());
        Map<String, Integer> scores = roomScores.get(roomId);
        scores.put(username, scores.getOrDefault(username, 0) + score);

        // Broadcast result to this user (or everyone? In Kahoot everyone sees who
        // answered)
        // For now, send result back to everyone so they can see "Player X answered"
        // (but hide correctness?)
        // Or just send Private result to user and Leaderboard update to everyone.

        Map<String, Object> result = new java.util.HashMap<>();
        result.put("type", "PLAYER_ANSWERED");
        result.put("username", username);
        result.put("scoreAdded", score);
        result.put("totalScore", scores.get(username));
        result.put("isCorrect", isCorrect); // Client validates coloring
        result.put("correctAnswer", currentQ.getCorrectAnswer()); // Reveal answer?

        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/game", result);
    }

    // Helper for Single Player (Keep existing logic)
    private Map<String, Object> fetchQuestionData(String topic) {
        com.example.backend.entity.quizz.Question q = questionService.getOrGenerateQuestion(topic);
        Map<String, Object> response = new java.util.HashMap<>();
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
        if (q.getExplanation() != null)
            response.put("explanation", q.getExplanation());
        return response;
    }

    // ... Single Player checkAnswer methods (Keep checkAnswer method as is or
    // rename)
    @MessageMapping("/check-answer")
    @SendTo("/topic/score")
    public java.util.Map<String, Object> checkAnswerInternal(String jsonMessage, Principal principal) {
        // Reuse the logic from before or call a service
        // For brevity, I'll copy the logic briefly or better, keep the original method
        // name
        // to avoid breaking single player.
        return processSinglePlayerAnswer(jsonMessage, principal);
    }

    private java.util.Map<String, Object> processSinglePlayerAnswer(String jsonMessage, Principal principal) {
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
