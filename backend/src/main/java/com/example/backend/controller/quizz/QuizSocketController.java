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
import com.example.backend.entity.room.Room;

@Controller
public class QuizSocketController {

    private final com.example.backend.service.quizz.QuestionService questionService;
    private final com.example.backend.repository.user.UserRepository userRepository;
    private final com.example.backend.repository.user.ScoreHistoryRepository scoreHistoryRepository; // NEW
    private final com.example.backend.service.room.RoomService roomService;
    private final SimpMessagingTemplate messagingTemplate;

    // Defines the current question for each room to ensure sync
    // roomId -> Map<QuestionData>
    private static final Map<String, com.example.backend.entity.quizz.Question> roomCurrentQuestion = new ConcurrentHashMap<>();

    // Store scores for the room: roomId -> (username -> score)
    private static final Map<String, Map<String, Integer>> roomScores = new ConcurrentHashMap<>();

    // Track users who answered current question: roomId -> Set<Username>
    private static final Map<String, java.util.Set<String>> roomAnsweredUsers = new ConcurrentHashMap<>();

    // Track current question index for each room: roomId -> questionIndex
    private static final Map<String, Integer> roomQuestionIndex = new ConcurrentHashMap<>();

    // Keep userStreaks for single player (or global streaks)
    private static final Map<String, Integer> userStreaks = new ConcurrentHashMap<>();

    // --- REFRESH PERSISTENCE (F5 SUPPORT) ---
    // roomId -> epochMillis (Start of current question)
    private static final Map<String, Long> roomQuestionStartTime = new ConcurrentHashMap<>();

    // username -> currentQuestion (Single Player)
    private static final Map<String, com.example.backend.entity.quizz.Question> userCurrentQuestion = new ConcurrentHashMap<>();

    // username -> epochMillis (Single Player question start)
    private static final Map<String, Long> userQuestionStartTime = new ConcurrentHashMap<>();

    // username -> topic (Single Player)
    private static final Map<String, String> userCurrentTopic = new ConcurrentHashMap<>();

    public QuizSocketController(com.example.backend.service.quizz.QuestionService questionService,
            com.example.backend.repository.user.UserRepository userRepository,
            com.example.backend.repository.user.ScoreHistoryRepository scoreHistoryRepository, // NEW
            com.example.backend.service.room.RoomService roomService,
            SimpMessagingTemplate messagingTemplate) {
        this.questionService = questionService;
        this.userRepository = userRepository;
        this.scoreHistoryRepository = scoreHistoryRepository;
        this.roomService = roomService;
        this.messagingTemplate = messagingTemplate;
    }

    // --- SINGLE PLAYER (Legacy) ---
    @MessageMapping("/get-question")
    @SendTo("/topic/quiz")
    public Map<String, Object> getQuestion(String topic, Principal principal) {
        String username = principal.getName();
        com.example.backend.entity.quizz.Question q = questionService.getOrGenerateQuestion(topic);

        userCurrentQuestion.put(username, q);
        userQuestionStartTime.put(username, System.currentTimeMillis());
        userCurrentTopic.put(username, topic);

        Map<String, Object> response = fetchQuestionDataFromObj(q);
        response.put("serverTime", System.currentTimeMillis());
        return response;
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

        // Reset question index to 0 or 1
        roomQuestionIndex.put(roomId, 0);
        sendNextQuestionToRoom(roomId, topic);
    }

    @MessageMapping("/room/{roomId}/next-question")
    public void nextQuestion(@DestinationVariable String roomId, String topic) {
        sendNextQuestionToRoom(roomId, topic);
    }

    private void sendNextQuestionToRoom(String roomId, String topic) {
        try {
            Room room = roomService.getRoomById(roomId);
            int currentIndex = roomQuestionIndex.getOrDefault(roomId, 0) + 1;

            if (currentIndex > room.getMaxQuestions()) {
                // GAME OVER
                broadcastGameOver(roomId);
                return;
            }

            roomQuestionIndex.put(roomId, currentIndex);

            com.example.backend.entity.quizz.Question q = questionService.getOrGenerateQuestion(topic);
            roomCurrentQuestion.put(roomId, q);
            roomQuestionStartTime.put(roomId, System.currentTimeMillis()); // RECORD START TIME
            // Reset answered users
            roomAnsweredUsers.put(roomId, ConcurrentHashMap.newKeySet());

            // Convert to response map
            Map<String, Object> response = fetchQuestionDataFromObj(q);
            response.put("type", "NEW_QUESTION");
            response.put("currentQuestion", currentIndex);
            response.put("totalQuestions", room.getMaxQuestions());
            response.put("serverTime", System.currentTimeMillis());

            messagingTemplate.convertAndSend("/topic/room/" + roomId + "/game", response);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void broadcastGameOver(String roomId) {
        Map<String, Object> gameOverSignal = new java.util.HashMap<>();
        gameOverSignal.put("type", "GAME_OVER");

        Map<String, Integer> scores = roomScores.get(roomId);
        java.util.List<Map<String, Object>> leaderboard = new java.util.ArrayList<>();
        if (scores != null) {
            scores.forEach((u, s) -> {
                leaderboard.add(Map.of("username", u, "score", s));
            });
        }
        leaderboard.sort((a, b) -> ((Integer) b.get("score")).compareTo((Integer) a.get("score")));
        gameOverSignal.put("leaderboard", leaderboard);

        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/game", gameOverSignal);

        // Mark room as FINISHED
        roomService.finishRoom(roomId);

        // Cleanup room memory state
        roomQuestionIndex.remove(roomId);
        roomCurrentQuestion.remove(roomId);
        roomQuestionStartTime.remove(roomId);
        roomScores.remove(roomId);
        roomAnsweredUsers.remove(roomId);
    }

    // --- RECONNECT LOGIC ---
    @MessageMapping("/quiz/reconnect")
    public void reconnect(String jsonString, Principal principal) {
        String username = principal.getName();
        Gson gson = new Gson();
        JsonObject input = gson.fromJson(jsonString, JsonObject.class);

        String roomId = input.has("roomId") ? input.get("roomId").getAsString() : null;
        String requestedTopic = input.has("topic") ? input.get("topic").getAsString() : null;
        boolean isMultiplayer = roomId != null && !roomId.isEmpty();

        Map<String, Object> response = new java.util.HashMap<>();
        response.put("type", "RECONNECT_STATE");
        response.put("serverTime", System.currentTimeMillis());

        if (isMultiplayer) {
            com.example.backend.entity.quizz.Question q = roomCurrentQuestion.get(roomId);
            if (q != null) {
                response.put("active", true);
                response.putAll(fetchQuestionDataFromObj(q));
                response.put("roomId", roomId);
                response.put("isMultiplayer", true);
                response.put("startTime", roomQuestionStartTime.get(roomId));
                response.put("currentQuestion", roomQuestionIndex.get(roomId));

                Room room = roomService.getRoomById(roomId);
                response.put("totalQuestions", room.getMaxQuestions());

                // Add current leaderboard
                Map<String, Integer> scores = roomScores.get(roomId);
                response.put("roomScore", scores != null ? scores.getOrDefault(username, 0) : 0);
            } else {
                response.put("active", false);
            }
        } else {
            // Single Player
            com.example.backend.entity.quizz.Question q = userCurrentQuestion.get(username);
            String activeTopic = userCurrentTopic.get(username);

            // Only reconnect if the topic matches or is null
            if (q != null && (requestedTopic == null || requestedTopic.equals(activeTopic))) {
                response.put("active", true);
                response.putAll(fetchQuestionDataFromObj(q));
                response.put("isMultiplayer", false);
                response.put("startTime", userQuestionStartTime.get(username));
                response.put("topic", userCurrentTopic.get(username));
            } else {
                response.put("active", false);
            }
        }
        messagingTemplate.convertAndSendToUser(username, "/queue/private", response);
    }

    @MessageMapping("/quiz/clear-session")
    public void clearSession(Principal principal) {
        String username = principal.getName();
        userCurrentQuestion.remove(username);
        userQuestionStartTime.remove(username);
        userCurrentTopic.remove(username);
        userStreaks.remove(username);
        System.out.println("Cleared single-player session for: " + username);
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

        // Mark user as answered
        roomAnsweredUsers.computeIfAbsent(roomId, k -> ConcurrentHashMap.newKeySet()).add(username);

        // --- PERSIST SCORE & STATS TO DB ---
        // Always update stats (games played, streak) even if score is 0
        try {
            com.example.backend.entity.user.User user = userRepository.findByUsername(username).orElse(null);
            if (user != null) {
                // 1. Update Games Played (increment for every question answered)
                user.setGamesPlayed(user.getGamesPlayed() + 1);

                // 2. Update Streak
                if (isCorrect) {
                    user.setStreak(user.getStreak() + 1);
                } else {
                    user.setStreak(0);
                }

                // 3. Update Total Score (DISABLED FOR MULTIPLAYER)
                // if (score > 0) {
                // user.setTotalScore(user.getTotalScore() + score);
                // ...
                // }
                // We do NOT save title/score to DB for Multiplayer as per user request.
                // Only room-session scores matter.
            }
        } catch (Exception e) {
            System.err.println("❌ Error saving multiplayer stats (Skipped): " + e.getMessage());
            e.printStackTrace();
        }
        // --------------------------------

        // 1. Send PRIVATE result to the user
        Map<String, Object> privateResult = new java.util.HashMap<>();
        privateResult.put("type", "ANSWER_RESULT");
        privateResult.put("isCorrect", isCorrect);
        privateResult.put("scoreAdded", score);
        privateResult.put("totalScore", scores.get(username));
        privateResult.put("correctAnswer", currentQ.getCorrectAnswer());
        privateResult.put("userAnswer", userAns);

        messagingTemplate.convertAndSendToUser(username, "/queue/private", privateResult);

        // 2. Broadcast PUBLIC "Submitted" event
        Map<String, Object> publicEvent = new java.util.HashMap<>();
        publicEvent.put("type", "PLAYER_SUBMITTED");
        publicEvent.put("username", username);

        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/game", publicEvent);

        // 3. Check if EVERYONE has answered
        try {
            int totalPlayers = roomService.getRoomById(roomId).getPlayers().size();
            int answeredCount = roomAnsweredUsers.get(roomId).size();

            if (answeredCount >= totalPlayers) {
                broadcastRoundResult(roomId, currentQ);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void broadcastRoundResult(String roomId, com.example.backend.entity.quizz.Question question) {
        Map<String, Object> roundResult = new java.util.HashMap<>();
        roundResult.put("type", "ROUND_OVER");
        roundResult.put("correctAnswer", question.getCorrectAnswer());

        Map<String, Integer> scores = roomScores.get(roomId);
        java.util.List<Map<String, Object>> leaderboard = new java.util.ArrayList<>();
        if (scores != null) {
            scores.forEach((u, s) -> {
                leaderboard.add(Map.of("username", u, "score", s));
            });
        }
        leaderboard.sort((a, b) -> ((Integer) b.get("score")).compareTo((Integer) a.get("score")));

        roundResult.put("leaderboard", leaderboard);

        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/game", roundResult);
    }

    // Helper to format Question object for JSON response
    private Map<String, Object> fetchQuestionDataFromObj(com.example.backend.entity.quizz.Question q) {
        Map<String, Object> response = new java.util.HashMap<>();
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

        if (q.getExplanation() != null) {
            response.put("explanation", q.getExplanation());
        }
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

        String userAns = (input.has("userAnswer") && !input.get("userAnswer").isJsonNull())
                ? input.get("userAnswer").getAsString()
                : "TIMEOUT";

        // Get the actual correct answer from server state for security and correctness
        com.example.backend.entity.quizz.Question currentQ = userCurrentQuestion.get(currentUsername);
        String correctAns = (currentQ != null) ? currentQ.getCorrectAnswer() : "";

        // Mặc định 0 nếu không gửi lên
        int timeLeft = (input.has("timeLeft") && !input.get("timeLeft").isJsonNull())
                ? input.get("timeLeft").getAsInt()
                : 0;

        java.util.Map<String, Object> response = new java.util.HashMap<>();
        response.put("username", currentUsername);
        response.put("userAnswer", userAns);
        response.put("correctAnswer", correctAns);

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

                if (earnedScore > 0) {
                    user.setTotalScore(user.getTotalScore() + earnedScore);

                    // SAVE HISTORY FOR SINGLE PLAYER
                    com.example.backend.entity.user.ScoreHistory history = new com.example.backend.entity.user.ScoreHistory(
                            user, (int) earnedScore, "SINGLE", null);
                    scoreHistoryRepository.save(history);
                }

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
