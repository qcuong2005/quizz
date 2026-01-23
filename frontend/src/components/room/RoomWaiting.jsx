import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import roomService from '../../services/roomService';
import { getCurrentUser } from '../../services/authService';
import './RoomWaiting.css';

const AVAILABLE_TOPICS = [
    "Toán", "Vật Lý", "Văn", "Sử",
    "Địa", "Tiếng Anh", "Đố mẹo", "Đố dân gian"
];

function RoomWaiting() {
    const { roomId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [room, setRoom] = useState(location.state?.room || null);
    const [isHost, setIsHost] = useState(location.state?.isHost || false);
    const [stompClient, setStompClient] = useState(null);
    const [copied, setCopied] = useState(false);

    // Topic state
    const [selectedTopics, setSelectedTopics] = useState([]);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let client = null;

        const initRoom = async () => {
            setLoading(true);
            let currentRoom = room;

            // 1. Always fetch room from server for accuracy (Multiplayer)
            if (roomId) {
                try {
                    const roomData = await roomService.getRoom(roomId);
                    currentRoom = roomData;
                    setRoom(roomData);

                    const user = getCurrentUser();
                    if (user && roomData.host === user.username) {
                        setIsHost(true);
                    }
                } catch (err) {
                    console.error("Error fetching room details:", err);
                    navigate('/room');
                    return;
                }
            }

            if (!currentRoom) {
                navigate('/room');
                return;
            }

            setLoading(false);

            // 2. Setup WebSocket
            const userStr = localStorage.getItem("user");
            const token = userStr ? JSON.parse(userStr).token : null;
            if (!token) {
                navigate('/login');
                return;
            }

            const socket = new SockJS('http://localhost:8080/ws-quiz');
            client = new Client({
                webSocketFactory: () => socket,
                connectHeaders: {
                    Authorization: `Bearer ${token}`
                },
                reconnectDelay: 5000,
                onConnect: () => {
                    console.log('WebSocket connected');
                    client.subscribe(`/topic/room/${roomId}`, (message) => {
                        const data = JSON.parse(message.body);
                        if (data.type === 'GAME_START') {
                            navigate(`/quiz?topic=${data.topic}&room=${data.roomId}&host=${isHost}`, {
                                state: { roomId: data.roomId, isMultiplayer: true, isHost: isHost }
                            });
                        } else if (data.type === 'ROOM_CANCELLED') {
                            alert("Phòng đã bị hủy bởi chủ phòng!");
                            navigate('/room');
                        } else {
                            setRoom(data);
                        }
                    });
                },
                onStompError: (frame) => {
                    console.error('STOMP error:', frame);
                    if (frame.headers['message']?.includes("chưa đăng nhập")) {
                        navigate('/login');
                    }
                }
            });

            client.activate();
            setStompClient(client);
        };

        initRoom();

        return () => {
            if (client) {
                client.deactivate();
            }
        };
        // eslint-disable-next-line
    }, [roomId, navigate]);

    const copyRoomId = () => {
        navigator.clipboard.writeText(roomId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleToggleTopic = (topic) => {
        setSelectedTopics(prev => {
            if (prev.includes(topic)) {
                return prev.filter(t => t !== topic);
            } else {
                return [...prev, topic];
            }
        });
    };

    const handleStartGame = () => {
        if (stompClient && stompClient.active) {
            // Join selected topics with comma
            const topicPayload = selectedTopics.length > 0
                ? selectedTopics.join(', ')
                : "Kiến thức chung"; // Fallback if somehow empty but shouldn't be valid

            stompClient.publish({
                destination: `/app/room/${roomId}/start`,
                body: topicPayload
            });
        }
    };

    const handleLeaveRoom = async () => {
        if (isHost) {
            // If host, cancel room in DB
            const userStr = localStorage.getItem("user");
            const token = userStr ? JSON.parse(userStr).token : null;

            try {
                await fetch(`http://localhost:8080/api/rooms/cancel?roomId=${roomId}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            } catch (err) {
                console.error("Error cancelling room:", err);
            }
        }

        if (stompClient) {
            stompClient.deactivate();
        }
        navigate('/room');
    };

    if (loading) {
        return (
            <div className="room-waiting">
                <div className="waiting-container" style={{ textAlign: 'center', padding: '100px' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto 20px' }}></div>
                    <h2 style={{ color: 'white' }}>Đang tải phòng...</h2>
                </div>
            </div>
        );
    }

    if (!room) return null;

    const playerCount = room.players?.length || 0;
    const canStart = isHost && playerCount >= 2 && selectedTopics.length > 0;

    return (
        <div className="room-waiting">

            <div className="waiting-container">
                <div className="room-header">
                    <h1 className="room-name">{room.roomName}</h1>
                    <div className="room-id-container">
                        <span className="room-id-label">Mã phòng:</span>
                        <div className="room-id-box" onClick={copyRoomId}>
                            <span className="room-id-value">{roomId}</span>
                            <button className="copy-btn">
                                {copied ? '✓ Đã sao chép' : '📋 Sao chép'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="players-section">
                    <h2 className="players-title">
                        Người chơi ({playerCount}/{room.capacity})
                    </h2>

                    <div className="players-grid">
                        {room.players?.map((player, index) => (
                            <div key={index} className="player-card">
                                <div className="player-avatar">
                                    {player.charAt(0).toUpperCase()}
                                </div>
                                <div className="player-info">
                                    <span className="player-name">{player}</span>
                                    {player === room.host && (
                                        <span className="host-badge">👑 Chủ phòng</span>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Empty slots */}
                        {Array.from({ length: room.capacity - playerCount }).map((_, index) => (
                            <div key={`empty-${index}`} className="player-card empty">
                                <div className="player-avatar empty-avatar">?</div>
                                <div className="player-info">
                                    <span className="player-name">Đang chờ...</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Topic Selection Section (Only for Host) */}
                {isHost && (
                    <div className="topic-selection-section">
                        <h2 className="section-title">Chọn chủ đề câu hỏi</h2>
                        <div className="topics-grid">
                            {AVAILABLE_TOPICS.map((topic) => (
                                <button
                                    key={topic}
                                    className={`topic-chip ${selectedTopics.includes(topic) ? 'selected' : ''}`}
                                    onClick={() => handleToggleTopic(topic)}
                                >
                                    {topic}
                                </button>
                            ))}
                        </div>
                        {selectedTopics.length === 0 && (
                            <p className="topic-warning">⚠️ Vui lòng chọn ít nhất 1 chủ đề để bắt đầu</p>
                        )}
                    </div>
                )}

                <div className="waiting-actions">
                    {isHost ? (
                        <>
                            <button
                                className="start-btn"
                                onClick={handleStartGame}
                                disabled={!canStart}
                            >
                                {canStart ? '🚀 Bắt Đầu Chơi' : `⏳ Chờ thêm ${2 - playerCount} người...`}
                            </button>
                            <button className="leave-btn" onClick={handleLeaveRoom}>
                                🚪 Hủy Phòng
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="waiting-message">
                                ⏳ Đang chờ chủ phòng bắt đầu...
                            </div>
                            <button className="leave-btn" onClick={handleLeaveRoom}>
                                🚪 Rời Phòng
                            </button>
                        </>
                    )}
                </div>
            </div >
        </div >
    );
}

export default RoomWaiting;
