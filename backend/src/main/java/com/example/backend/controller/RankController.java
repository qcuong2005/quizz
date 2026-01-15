package com.example.backend.controller;

import com.example.backend.entity.user.User;
import com.example.backend.repository.user.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/rankings")
@org.springframework.web.bind.annotation.CrossOrigin("*")
public class RankController {

    private final UserRepository userRepository;

    public RankController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<?> getTopRankings(
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "score") String type) {
        String sortField = "totalScore";
        if ("streak".equalsIgnoreCase(type)) {
            sortField = "streak";
        } else if ("games".equalsIgnoreCase(type)) {
            sortField = "gamesPlayed";
        }

        // Fetch Top 20 users by Selected Field DESC
        List<User> topUsers = userRepository.findAll(
                PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, sortField))).getContent();

        // Convert to simplified DTO
        List<Map<String, Object>> rankingList = topUsers.stream().map(user -> {
            Map<String, Object> map = new HashMap<>();
            map.put("username", user.getUsername());
            map.put("fullName", user.getFullName());
            map.put("totalScore", user.getTotalScore());
            map.put("streak", user.getStreak());
            map.put("gamesPlayed", user.getGamesPlayed());
            // Map avatar logic (e.g. initial char or specific avatar url if added later)
            map.put("avatar", user.getUsername().substring(0, 1).toUpperCase());
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(rankingList);
    }
}
