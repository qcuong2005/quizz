import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../../context/ChatContext';
import { getFriends } from '../../services/friendService';
import './ChatListPopup.css';

const ChatListPopup = ({ onClose }) => {
    const [friends, setFriends] = useState([]);
    const { openChat, userStatusUpdate } = useChat();
    const navigate = useNavigate();

    useEffect(() => {
        loadFriends();
    }, []);

    // Handle real-time status updates
    useEffect(() => {
        if (userStatusUpdate) {
            setFriends(prev => prev.map(f =>
                f.username === userStatusUpdate.username
                    ? { ...f, online: userStatusUpdate.online }
                    : f
            ));
        }
    }, [userStatusUpdate]);

    const loadFriends = async () => {
        try {
            const data = await getFriends();
            setFriends(data);
        } catch (error) {
            console.error("Failed to load friends", error);
        }
    };

    const handleSelectFriend = (friend) => {
        openChat(friend);
        onClose();
    };

    return (
        <div className="chat-list-popup">
            <div className="chat-list-header">
                <h3>Đoạn chat</h3>
            </div>
            <div className="chat-list-content">
                {friends.length === 0 ? (
                    <div className="empty-chat-list">
                        <p>Chưa có bạn bè nào.</p>
                        <button onClick={() => { navigate('/friends'); onClose(); }}>Thêm bạn ngay</button>
                    </div>
                ) : (
                    friends.map(friend => (
                        <div
                            key={friend.id}
                            className="chat-list-item"
                            onClick={() => handleSelectFriend(friend)}
                        >
                            <div className="chat-list-avatar">
                                {(friend.fullName || friend.username).charAt(0).toUpperCase()}
                                <span className={`status-dot-mini ${friend.online ? 'online' : 'offline'}`} />
                            </div>
                            <div className="chat-list-info">
                                <span className="friend-name">{friend.fullName || friend.username}</span>
                                <span className="friend-status">{friend.online ? 'Đang hoạt động' : 'Ngoại tuyến'}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ChatListPopup;
