import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import roomService from '../../services/roomService';
import { getCurrentUser } from '../../services/authService';
import Header from '../layout/Header';
import './RoomLobby.css';

function RoomLobby() {
    const navigate = useNavigate();
    const [mode, setMode] = useState('menu'); // 'menu', 'create', 'join'
    const [roomName, setRoomName] = useState('');
    const [capacity, setCapacity] = useState(2);
    const [roomId, setRoomId] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Check authentication
    useEffect(() => {
        const user = getCurrentUser();
        if (!user) {
            alert('Bạn cần đăng nhập để chơi Multiplayer!');
            navigate('/login');
        }
    }, [navigate]);

    const handleCreateRoom = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const room = await roomService.createRoom(roomName, capacity);
            navigate(`/room/${room.roomId}`, { state: { room, isHost: true } });
        } catch (err) {
            if (err.response?.status === 403) {
                setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!');
                setTimeout(() => navigate('/login'), 2000);
            } else {
                setError(typeof err === 'string' ? err : 'Không thể tạo phòng');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleJoinRoom = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const room = await roomService.joinRoom(roomId);
            navigate(`/room/${room.roomId}`, { state: { room, isHost: false } });
        } catch (err) {
            if (err.response?.status === 403) {
                setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!');
                setTimeout(() => navigate('/login'), 2000);
            } else {
                setError(typeof err === 'string' ? err : 'Không thể vào phòng');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="room-lobby">
            <Header />

            <div className="lobby-container">
                <h1 className="lobby-title">🎮 Phòng Multiplayer</h1>

                {mode === 'menu' && (
                    <div className="lobby-menu">
                        <button
                            className="lobby-btn create-btn"
                            onClick={() => setMode('create')}
                        >
                            ➕ Tạo Phòng Mới
                        </button>
                        <button
                            className="lobby-btn join-btn"
                            onClick={() => setMode('join')}
                        >
                            🚪 Vào Phòng
                        </button>
                        <button
                            className="lobby-btn back-btn"
                            onClick={() => navigate('/')}
                        >
                            ⬅️ Quay Lại
                        </button>
                    </div>
                )}

                {mode === 'create' && (
                    <div className="lobby-form-container">
                        <h2>Tạo Phòng Mới</h2>
                        <form onSubmit={handleCreateRoom} className="lobby-form">
                            <div className="form-group">
                                <label>Tên Phòng:</label>
                                <input
                                    type="text"
                                    value={roomName}
                                    onChange={(e) => setRoomName(e.target.value)}
                                    placeholder="Nhập tên phòng..."
                                    required
                                    maxLength={30}
                                />
                            </div>

                            <div className="form-group">
                                <label>Số Người Chơi:</label>
                                <div className="capacity-selector">
                                    {[2, 3, 4].map(num => (
                                        <button
                                            key={num}
                                            type="button"
                                            className={`capacity-btn ${capacity === num ? 'active' : ''}`}
                                            onClick={() => setCapacity(num)}
                                        >
                                            {num} người
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {error && <div className="error-message">{error}</div>}

                            <div className="form-actions">
                                <button
                                    type="submit"
                                    className="submit-btn"
                                    disabled={loading}
                                >
                                    {loading ? 'Đang tạo...' : '✨ Tạo Phòng'}
                                </button>
                                <button
                                    type="button"
                                    className="cancel-btn"
                                    onClick={() => { setMode('menu'); setError(''); }}
                                >
                                    Hủy
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {mode === 'join' && (
                    <div className="lobby-form-container">
                        <h2>Vào Phòng</h2>
                        <form onSubmit={handleJoinRoom} className="lobby-form">
                            <div className="form-group">
                                <label>Mã Phòng:</label>
                                <input
                                    type="text"
                                    value={roomId}
                                    onChange={(e) => setRoomId(e.target.value)}
                                    placeholder="Nhập mã 4 chữ số..."
                                    required
                                    maxLength={4}
                                    pattern="[0-9]{4}"
                                />
                            </div>

                            {error && <div className="error-message">{error}</div>}

                            <div className="form-actions">
                                <button
                                    type="submit"
                                    className="submit-btn"
                                    disabled={loading}
                                >
                                    {loading ? 'Đang vào...' : '🚀 Vào Phòng'}
                                </button>
                                <button
                                    type="button"
                                    className="cancel-btn"
                                    onClick={() => { setMode('menu'); setError(''); }}
                                >
                                    Hủy
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}

export default RoomLobby;
