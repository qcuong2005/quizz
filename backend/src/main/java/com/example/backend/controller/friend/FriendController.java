package com.example.backend.controller.friend;

import com.example.backend.entity.user.User;
import com.example.backend.repository.user.UserRepository;
import com.example.backend.security.JwtUtils;
import com.example.backend.service.friend.FriendService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/friends")
@CrossOrigin("*")
public class FriendController {

    private final FriendService friendService;
    private final JwtUtils jwtUtils;
    private final UserRepository userRepository;

    public FriendController(FriendService friendService, JwtUtils jwtUtils, UserRepository userRepository) {
        this.friendService = friendService;
        this.jwtUtils = jwtUtils;
        this.userRepository = userRepository;
    }

    /**
     * Extract user ID from JWT token
     */
    private Long getUserIdFromToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new RuntimeException("Invalid authorization header");
        }
        String token = authHeader.substring(7);
        String username = jwtUtils.extractUsername(token);

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return user.getId();
    }

    /**
     * Send a friend request
     * POST /api/friends/request
     * Body: { "friendId": 123 }
     */
    @PostMapping("/request")
    public ResponseEntity<?> sendFriendRequest(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, Long> payload) {
        try {
            Long senderId = getUserIdFromToken(authHeader);
            Long receiverId = payload.get("friendId");

            if (receiverId == null) {
                return ResponseEntity.badRequest().body("friendId is required");
            }

            Map<String, Object> result = friendService.sendFriendRequest(senderId, receiverId);

            if ((Boolean) result.get("success")) {
                return ResponseEntity.ok(result);
            } else {
                return ResponseEntity.badRequest().body(result);
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Lỗi: " + e.getMessage());
        }
    }

    /**
     * Accept a friend request
     * POST /api/friends/accept/{requestId}
     */
    @PostMapping("/accept/{requestId}")
    public ResponseEntity<?> acceptFriendRequest(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long requestId) {
        try {
            Long userId = getUserIdFromToken(authHeader);
            Map<String, Object> result = friendService.acceptFriendRequest(requestId, userId);

            if ((Boolean) result.get("success")) {
                return ResponseEntity.ok(result);
            } else {
                return ResponseEntity.badRequest().body(result);
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Lỗi: " + e.getMessage());
        }
    }

    /**
     * Reject a friend request
     * POST /api/friends/reject/{requestId}
     */
    @PostMapping("/reject/{requestId}")
    public ResponseEntity<?> rejectFriendRequest(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long requestId) {
        try {
            Long userId = getUserIdFromToken(authHeader);
            Map<String, Object> result = friendService.rejectFriendRequest(requestId, userId);

            if ((Boolean) result.get("success")) {
                return ResponseEntity.ok(result);
            } else {
                return ResponseEntity.badRequest().body(result);
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Lỗi: " + e.getMessage());
        }
    }

    /**
     * Remove a friend
     * DELETE /api/friends/{friendId}
     */
    @DeleteMapping("/{friendId}")
    public ResponseEntity<?> removeFriend(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long friendId) {
        try {
            Long userId = getUserIdFromToken(authHeader);
            Map<String, Object> result = friendService.removeFriend(userId, friendId);

            if ((Boolean) result.get("success")) {
                return ResponseEntity.ok(result);
            } else {
                return ResponseEntity.badRequest().body(result);
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Lỗi: " + e.getMessage());
        }
    }

    /**
     * Get friends list
     * GET /api/friends
     */
    @GetMapping
    public ResponseEntity<?> getFriends(@RequestHeader("Authorization") String authHeader) {
        try {
            Long userId = getUserIdFromToken(authHeader);
            List<Map<String, Object>> friends = friendService.getFriends(userId);
            return ResponseEntity.ok(friends);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Lỗi: " + e.getMessage());
        }
    }

    /**
     * Get pending friend requests
     * GET /api/friends/requests
     */
    @GetMapping("/requests")
    public ResponseEntity<?> getPendingRequests(@RequestHeader("Authorization") String authHeader) {
        try {
            Long userId = getUserIdFromToken(authHeader);
            List<Map<String, Object>> requests = friendService.getPendingRequests(userId);
            return ResponseEntity.ok(requests);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Lỗi: " + e.getMessage());
        }
    }

    /**
     * Search users
     * GET /api/friends/search?query=username
     */
    @GetMapping("/search")
    public ResponseEntity<?> searchUsers(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam String query) {
        try {
            Long userId = getUserIdFromToken(authHeader);
            List<Map<String, Object>> users = friendService.searchUsers(userId, query);
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Lỗi: " + e.getMessage());
        }
    }
}
