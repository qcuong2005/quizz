const API_URL = "http://localhost:8080/api/friends";

// Helper to get auth headers
const getAuthHeaders = () => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !user.token) {
        throw new Error("Not authenticated");
    }
    return {
        "Authorization": `Bearer ${user.token}`,
        "Content-Type": "application/json"
    };
};

/**
 * Search for users by username
 */
export const searchUsers = async (query) => {
    const response = await fetch(`${API_URL}/search?query=${encodeURIComponent(query)}`, {
        method: "GET",
        headers: getAuthHeaders()
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to search users");
    }

    return response.json();
};

/**
 * Send a friend request
 */
export const sendFriendRequest = async (friendId) => {
    const response = await fetch(`${API_URL}/request`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ friendId })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to send friend request");
    }

    return response.json();
};

/**
 * Accept a friend request
 */
export const acceptFriendRequest = async (requestId) => {
    const response = await fetch(`${API_URL}/accept/${requestId}`, {
        method: "POST",
        headers: getAuthHeaders()
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to accept friend request");
    }

    return response.json();
};

/**
 * Reject a friend request
 */
export const rejectFriendRequest = async (requestId) => {
    const response = await fetch(`${API_URL}/reject/${requestId}`, {
        method: "POST",
        headers: getAuthHeaders()
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to reject friend request");
    }

    return response.json();
};

/**
 * Remove a friend
 */
export const removeFriend = async (friendId) => {
    const response = await fetch(`${API_URL}/${friendId}`, {
        method: "DELETE",
        headers: getAuthHeaders()
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to remove friend");
    }

    return response.json();
};

/**
 * Get friends list
 */
export const getFriends = async () => {
    const response = await fetch(API_URL, {
        method: "GET",
        headers: getAuthHeaders()
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to get friends");
    }

    return response.json();
};

/**
 * Get pending friend requests
 */
export const getPendingRequests = async () => {
    const response = await fetch(`${API_URL}/requests`, {
        method: "GET",
        headers: getAuthHeaders()
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to get friend requests");
    }

    return response.json();
};

