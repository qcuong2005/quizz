package com.example.backend.repository.user;

import com.example.backend.entity.user.Friendship;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FriendshipRepository extends JpaRepository<Friendship, Long> {

    // Find all friendships where user is either userId or friendId
    @Query("SELECT f FROM Friendship f WHERE f.userId = :userId OR f.friendId = :userId")
    List<Friendship> findAllByUserId(@Param("userId") Long userId);

    // Check if two users are friends (bidirectional check)
    @Query("SELECT f FROM Friendship f WHERE (f.userId = :userId AND f.friendId = :friendId) OR (f.userId = :friendId AND f.friendId = :userId)")
    Optional<Friendship> findFriendship(@Param("userId") Long userId, @Param("friendId") Long friendId);

    // Delete friendship (bidirectional)
    @Modifying
    @Query("DELETE FROM Friendship f WHERE (f.userId = :userId AND f.friendId = :friendId) OR (f.userId = :friendId AND f.friendId = :userId)")
    void deleteFriendship(@Param("userId") Long userId, @Param("friendId") Long friendId);

    // Count friends for a user
    @Query("SELECT COUNT(f) FROM Friendship f WHERE f.userId = :userId OR f.friendId = :userId")
    long countFriendsByUserId(@Param("userId") Long userId);
}
