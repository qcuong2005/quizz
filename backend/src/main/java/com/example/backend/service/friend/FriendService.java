package com.example.backend.service.friend;

import com.example.backend.entity.user.FriendRequest;
import com.example.backend.entity.user.FriendRequest.RequestStatus;
import com.example.backend.entity.user.Friendship;
import com.example.backend.entity.user.User;
import com.example.backend.repository.user.FriendRequestRepository;
import com.example.backend.repository.user.FriendshipRepository;
import com.example.backend.repository.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class FriendService {

    private final FriendshipRepository friendshipRepository;
    private final FriendRequestRepository friendRequestRepository;
    private final UserRepository userRepository;

    public FriendService(FriendshipRepository friendshipRepository,
            FriendRequestRepository friendRequestRepository,
            UserRepository userRepository) {
        this.friendshipRepository = friendshipRepository;
        this.friendRequestRepository = friendRequestRepository;
        this.userRepository = userRepository;
    }

    /**
     * Send a friend request from current user to another user
     */
    @Transactional
    public Map<String, Object> sendFriendRequest(Long senderId, Long receiverId) {
        Map<String, Object> response = new HashMap<>();

        // Validate users exist
        if (!userRepository.existsById(senderId)) {
            response.put("success", false);
            response.put("message", "Người gửi không tồn tại");
            return response;
        }
        if (!userRepository.existsById(receiverId)) {
            response.put("success", false);
            response.put("message", "Người nhận không tồn tại");
            return response;
        }

        // Can't send request to yourself
        if (senderId.equals(receiverId)) {
            response.put("success", false);
            response.put("message", "Không thể kết bạn với chính mình");
            return response;
        }

        // Check if already friends
        Optional<Friendship> existingFriendship = friendshipRepository.findFriendship(senderId, receiverId);
        if (existingFriendship.isPresent()) {
            response.put("success", false);
            response.put("message", "Đã là bạn bè rồi");
            return response;
        }

        // Check if pending request already exists
        Optional<FriendRequest> existingRequest = friendRequestRepository.findExistingRequest(
                senderId, receiverId, RequestStatus.PENDING);
        if (existingRequest.isPresent()) {
            response.put("success", false);
            response.put("message", "Lời mời kết bạn đã được gửi trước đó");
            return response;
        }

        // Create new friend request
        FriendRequest request = new FriendRequest(senderId, receiverId);
        friendRequestRepository.save(request);

        response.put("success", true);
        response.put("message", "Đã gửi lời mời kết bạn");
        response.put("requestId", request.getId());
        return response;
    }

    /**
     * Accept a friend request
     */
    @Transactional
    public Map<String, Object> acceptFriendRequest(Long requestId, Long receiverId) {
        Map<String, Object> response = new HashMap<>();

        // Find the request and verify receiver
        FriendRequest request = friendRequestRepository.findByIdAndReceiverId(requestId, receiverId)
                .orElseThrow(() -> new RuntimeException("Lời mời không tồn tại hoặc bạn không có quyền"));

        if (request.getStatus() != RequestStatus.PENDING) {
            response.put("success", false);
            response.put("message", "Lời mời đã được xử lý trước đó");
            return response;
        }

        // Update request status
        request.setStatus(RequestStatus.ACCEPTED);
        friendRequestRepository.save(request);

        // Create bidirectional friendship
        Friendship friendship = new Friendship(request.getSenderId(), request.getReceiverId());
        friendshipRepository.save(friendship);

        response.put("success", true);
        response.put("message", "Đã chấp nhận lời mời kết bạn");
        return response;
    }

    /**
     * Reject a friend request
     */
    @Transactional
    public Map<String, Object> rejectFriendRequest(Long requestId, Long receiverId) {
        Map<String, Object> response = new HashMap<>();

        FriendRequest request = friendRequestRepository.findByIdAndReceiverId(requestId, receiverId)
                .orElseThrow(() -> new RuntimeException("Lời mời không tồn tại hoặc bạn không có quyền"));

        if (request.getStatus() != RequestStatus.PENDING) {
            response.put("success", false);
            response.put("message", "Lời mời đã được xử lý trước đó");
            return response;
        }

        request.setStatus(RequestStatus.REJECTED);
        friendRequestRepository.save(request);

        response.put("success", true);
        response.put("message", "Đã từ chối lời mời kết bạn");
        return response;
    }

    /**
     * Remove a friend
     */
    @Transactional
    public Map<String, Object> removeFriend(Long userId, Long friendId) {
        Map<String, Object> response = new HashMap<>();

        Optional<Friendship> friendship = friendshipRepository.findFriendship(userId, friendId);
        if (friendship.isEmpty()) {
            response.put("success", false);
            response.put("message", "Không phải bạn bè");
            return response;
        }

        friendshipRepository.delete(friendship.get());

        response.put("success", true);
        response.put("message", "Đã xóa bạn");
        return response;
    }

    /**
     * Get list of friends with their statistics
     */
    public List<Map<String, Object>> getFriends(Long userId) {
        List<Friendship> friendships = friendshipRepository.findAllByUserId(userId);

        return friendships.stream().map(friendship -> {
            Long friendId = friendship.getUserId().equals(userId)
                    ? friendship.getFriendId()
                    : friendship.getUserId();

            User friend = userRepository.findById(friendId).orElse(null);
            if (friend == null)
                return null;

            Map<String, Object> friendData = new HashMap<>();
            friendData.put("id", friend.getId());
            friendData.put("username", friend.getUsername());
            friendData.put("fullName", friend.getFullName());
            friendData.put("totalScore", friend.getTotalScore());
            friendData.put("streak", friend.getStreak());
            friendData.put("gamesPlayed", friend.getGamesPlayed());
            friendData.put("online", friend.isOnline());
            friendData.put("friendsSince", friendship.getCreatedAt());

            // Calculate rank
            long rankPosition = userRepository.countByTotalScoreGreaterThan(friend.getTotalScore()) + 1;
            friendData.put("rank", rankPosition);

            return friendData;
        })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    /**
     * Get pending friend requests
     */
    public List<Map<String, Object>> getPendingRequests(Long userId) {
        List<FriendRequest> requests = friendRequestRepository.findByReceiverIdAndStatus(
                userId, RequestStatus.PENDING);

        return requests.stream().map(request -> {
            User sender = userRepository.findById(request.getSenderId()).orElse(null);
            if (sender == null)
                return null;

            Map<String, Object> requestData = new HashMap<>();
            requestData.put("requestId", request.getId());
            requestData.put("senderId", sender.getId());
            requestData.put("senderUsername", sender.getUsername());
            requestData.put("senderFullName", sender.getFullName());
            requestData.put("senderScore", sender.getTotalScore());
            requestData.put("createdAt", request.getCreatedAt());

            return requestData;
        })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    /**
     * Search users by username (excluding current user and existing friends)
     */
    public List<Map<String, Object>> searchUsers(Long currentUserId, String query) {
        if (query == null || query.trim().isEmpty()) {
            return new ArrayList<>();
        }

        List<User> users = userRepository.findByUsernameContainingIgnoreCase(query.trim());

        // Get current user's friends
        List<Friendship> friendships = friendshipRepository.findAllByUserId(currentUserId);
        Set<Long> friendIds = friendships.stream()
                .map(f -> f.getUserId().equals(currentUserId) ? f.getFriendId() : f.getUserId())
                .collect(Collectors.toSet());

        // Get pending requests (both sent and received)
        List<FriendRequest> sentRequests = friendRequestRepository.findBySenderId(currentUserId);
        List<FriendRequest> receivedRequests = friendRequestRepository.findByReceiverIdAndStatus(
                currentUserId, RequestStatus.PENDING);

        Set<Long> pendingUserIds = new HashSet<>();
        sentRequests.stream()
                .filter(r -> r.getStatus() == RequestStatus.PENDING)
                .forEach(r -> pendingUserIds.add(r.getReceiverId()));
        receivedRequests.forEach(r -> pendingUserIds.add(r.getSenderId()));

        return users.stream()
                .filter(user -> !user.getId().equals(currentUserId)) // Exclude self
                .filter(user -> !friendIds.contains(user.getId())) // Exclude existing friends
                .limit(20) // Limit results
                .map(user -> {
                    Map<String, Object> userData = new HashMap<>();
                    userData.put("id", user.getId());
                    userData.put("username", user.getUsername());
                    userData.put("fullName", user.getFullName());
                    userData.put("totalScore", user.getTotalScore());
                    userData.put("online", user.isOnline());
                    userData.put("isPending", pendingUserIds.contains(user.getId()));

                    long rankPosition = userRepository.countByTotalScoreGreaterThan(user.getTotalScore()) + 1;
                    userData.put("rank", rankPosition);

                    return userData;
                })
                .collect(Collectors.toList());
    }
}
