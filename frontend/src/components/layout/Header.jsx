import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../../services/authService';
import { getPendingRequests } from '../../services/friendService';
import ChatListPopup from '../chat/ChatListPopup';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { MessageCircle } from 'lucide-react';

const Header = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [pendingCount, setPendingCount] = useState(0);
    const [showChatPopup, setShowChatPopup] = useState(false);
    const chatPopupRef = useRef(null);
    const { unreadCount } = useChat();

    useEffect(() => {
        if (user) {
            fetchPendingRequests();
        }
    }, [user?.username]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (chatPopupRef.current && !chatPopupRef.current.contains(e.target)) {
                setShowChatPopup(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
                            <Link to="/forum" className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                                💬 Diễn đàn
                            </Link>
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

                            {/* Chat Icon */}
                            <div ref={chatPopupRef} style={{ position: 'relative' }}>
                                <button
                                    onClick={() => setShowChatPopup(!showChatPopup)}
                                    className="btn btn-ghost"
                                    style={{
                                        padding: '8px 12px',
                                        fontSize: '0.9rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        position: 'relative'
                                    }}
                                >
                                    <MessageCircle size={18} />
                                    Chat
                                    {unreadCount > 0 && (
                                        <span style={{
                                            position: 'absolute',
                                            top: '-5px',
                                            right: '-5px',
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
                                            {unreadCount}
                                        </span>
                                    )}
                                </button>
                                {showChatPopup && (
                                    <ChatListPopup onClose={() => setShowChatPopup(false)} />
                                )}
                            </div>


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
                            <Link to="/forum" className="nav-link" style={{ marginRight: '20px' }}>💬 Diễn đàn</Link>
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
