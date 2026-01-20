import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../../services/authService';
import '../../styles/GlobalStyles.css';
const Header = () => {
    const user = getCurrentUser();
    const navigate = useNavigate();

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
                            <Link to="/friends" className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                                👥 Bạn bè
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
