import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import './RoomChat.css';

const RoomChat = ({ roomId, currentUser, stompClient, isConnected }) => {
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState("");
    const messagesEndRef = useRef(null);
    const subscriptionRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (!stompClient || !isConnected || !roomId) return;

        // Subscribe to room chat topic
        subscriptionRef.current = stompClient.subscribe(`/topic/chat/${roomId}`, (message) => {
            try {
                const data = JSON.parse(message.body);
                setMessages(prev => [...prev, data]);
            } catch (error) {
                console.error("Error parsing chat message:", error);
            }
        });

        return () => {
            if (subscriptionRef.current) {
                subscriptionRef.current.unsubscribe();
            }
        };
    }, [stompClient, isConnected, roomId]);

    const handleSendMessage = () => {
        if (!inputText.trim() || !stompClient || !stompClient.connected) return;

        const chatMessage = {
            sender: currentUser.username || currentUser.fullName || "Unknown",
            content: inputText.trim()
        };

        try {
            stompClient.publish({
                destination: `/app/chat/${roomId}/sendMessage`,
                body: JSON.stringify(chatMessage)
            });
            setInputText("");
        } catch (error) {
            console.error("Failed to send message:", error);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    };

    return (
        <div className="room-chat-container">
            <div className="room-chat-header">
                <MessageCircle size={20} color="#6366f1" />
                <h3 className="room-chat-title">Trò chuyện phòng</h3>
            </div>

            <div className="room-chat-messages">
                {messages.length === 0 ? (
                    <div className="empty-chat-state" style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.4)' }}>
                        <p>Chưa có tin nhắn nào.<br />Hãy chào mọi người đi!</p>
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const isSelf = msg.sender === (currentUser.username || currentUser.fullName);
                        return (
                            <div key={index} className={`room-message ${isSelf ? 'self' : 'other'}`}>
                                <span className="message-sender">{isSelf ? 'Bạn' : msg.sender}</span>
                                <div className="message-bubble">
                                    {msg.content}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="room-chat-input-area">
                <input
                    type="text"
                    className="room-chat-input"
                    placeholder="Nhập tin nhắn..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={handleKeyPress}
                />
                <button
                    className="room-chat-send-btn"
                    onClick={handleSendMessage}
                    disabled={!inputText.trim()}
                >
                    <Send size={18} />
                </button>
            </div>
        </div>
    );
};

export default RoomChat;
