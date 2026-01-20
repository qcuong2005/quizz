package com.example.backend.repository.user;

import com.example.backend.entity.user.FriendRequest;
import com.example.backend.entity.user.FriendRequest.RequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FriendRequestRepository extends JpaRepository<FriendRequest, Long> {

        // Find all pending requests received by a user
        List<FriendRequest> findByReceiverIdAndStatus(Long receiverId, RequestStatus status);

        // Find all requests sent by a user
        List<FriendRequest> findBySenderId(Long senderId);

        // Check if a request already exists between two users (in either direction)
        @Query("SELECT fr FROM FriendRequest fr WHERE " +
                        "((fr.senderId = :userId1 AND fr.receiverId = :userId2) OR " +
                        "(fr.senderId = :userId2 AND fr.receiverId = :userId1)) AND " +
                        "fr.status = :status")
        Optional<FriendRequest> findExistingRequest(
                        @Param("userId1") Long userId1,
                        @Param("userId2") Long userId2,
                        @Param("status") RequestStatus status);

        // Find request by ID and receiver (for security - only receiver can accept)
        Optional<FriendRequest> findByIdAndReceiverId(Long id, Long receiverId);
}
