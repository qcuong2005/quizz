import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getCurrentUser, logout } from '../../services/authService';
import { getPendingRequests } from '../../services/friendService';
import '../../styles/GlobalStyles.css';

const Header = () => {
    const user = getCurrentUser();
    const navigate = useNavigate();
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        if (user) {
            fetchPendingRequests();

            // Connect to WebSocket for Online Status
            const socket = new SockJS('http://localhost:8080/ws-quiz');
            const client = new Client({
                webSocketFactory: () => socket,
                connectHeaders: {
                    Authorization: `Bearer ${user.token}`
                },
                debug: (str) => {
                    // console.log(str); 
                },
                onConnect: () => {
                    console.log("Connected to WS (Online Status Active)");
                },
                onStompError: (frame) => {
                    console.error('Broker reported error: ' + frame.headers['message']);
                    console.error('Additional details: ' + frame.body);
                }
            });

            client.activate();

            return () => {
                client.deactivate();
            };
        }
    }, [user?.username]); // Re-fetch when user changes

    const fetchPendingRequests = async () => {
        try {
            const requests = await getPendingRequests();
            setPendingCount(requests.length);
        } catch (error) {
            console.error("Failed to fetch pending requests", error);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="navbar">
            <div className="navbar-content">
                {/* Logo */}
                <Link to="/" className="logo">
                    <span className="logo-icon">🧠</span>
                    <span>QuizMaster</span>
                </Link>

                {/* Navigation */}
                <div className="nav-links">
                    {user ? (
                        <>
                            <span style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                color: 'var(--text-secondary)'
                            }}>
                                👋 Xin chào, <strong style={{ color: 'var(--accent-cyan)' }}>{user.fullName || user.username}</strong>
                            </span>
                            <Link to="/friends" className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: '0.9rem', position: 'relative' }}>
                                👥 Bạn bè
                                {pendingCount > 0 && (
                                    <span style={{
                                        position: 'absolute',
                                        top: '0px',
                                        right: '0px',
                                        background: '#ff4757',
                                        color: 'white',
                                        borderRadius: '50%',
                                        width: '18px',
                                        height: '18px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.7rem',
                                        fontWeight: 'bold',
                                        boxShadow: '0 2px 5px rgba(255, 71, 87, 0.4)',
                                        border: '1px solid rgba(255,255,255,0.2)'
                                    }}>
                                        {pendingCount}
                                    </span>
                                )}
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="btn btn-ghost"
                                style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                            >
                                🚪 Đăng xuất
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="nav-link">Đăng nhập</Link>
                            <Link to="/register" className="btn btn-primary" style={{ padding: '8px 20px' }}>
                                Đăng ký
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Header;
