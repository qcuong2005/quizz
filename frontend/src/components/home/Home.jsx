import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../../services/authService';
import Header from '../layout/Header';
import '../../styles/GlobalStyles.css';

const Home = () => {
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const currentUser = getCurrentUser();
        setUser(currentUser);
    }, []);

    // Topics with icons
    const TOPICS = [
        { name: "Toán", icon: "📐", desc: "Số học, hình học" },
        { name: "Văn", icon: "📖", desc: "Văn học, ngữ pháp" },
        { name: "Sử", icon: "🏛️", desc: "Lịch sử Việt Nam & thế giới" },
        { name: "Địa", icon: "🌍", desc: "Địa lý tự nhiên" },
        { name: "Tiếng Anh", icon: "🇬🇧", desc: "Vocabulary, Grammar" },
        { name: "Đố vui", icon: "🎯", desc: "Câu hỏi thú vị" },
        { name: "Đố mẹo", icon: "🧩", desc: "Đánh lừa tư duy" },
        { name: "Đố dân gian", icon: "🎎", desc: "Tri thức dân gian" }
    ];

    const handleTopicClick = (topic) => {
        navigate(`/quiz?topic=${topic}`);
    };

    const handleLogout = () => {
        logout();
        setUser(null);
        navigate('/login');
    };

    return (
        <div className="page-wrapper">
            {/* Animated Background */}
            <div className="animated-bg">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
                <div className="orb orb-3"></div>
            </div>

            {/* Header */}
            <Header />

            {/* Main Content */}
            <main className="home-page" style={{ position: 'relative', zIndex: 1 }}>
                {/* Hero Section */}
                <section className="hero-section">
                    <h1 className="hero-title">🧠 QuizMaster</h1>
                    <p className="hero-subtitle">
                        Khám phá kiến thức, thử thách bản thân và leo hạng cùng bạn bè!
                    </p>
                </section>

                {user ? (
                    <>
                        {/* User Welcome */}
                        <div className="user-welcome">
                            <div className="user-avatar">
                                {user.username?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div className="user-info">
                                <h2>Xin chào, {user.username}! 👋</h2>
                                <p>Chọn một chủ đề để bắt đầu chơi</p>
                            </div>
                        </div>

                        {/* Topics Grid */}
                        <section className="topics-section">
                            <div className="topics-grid">
                                {TOPICS.map((topic, index) => (
                                    <div
                                        key={topic.name}
                                        className="topic-card"
                                        onClick={() => handleTopicClick(topic.name)}
                                        style={{ animationDelay: `${index * 0.05}s` }}
                                    >
                                        <span className="topic-icon">{topic.icon}</span>
                                        <span className="topic-name">{topic.name}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </>
                ) : (
                    /* Guest CTA */
                    <div className="guest-cta glass-card">
                        <p>
                            🏆 Đăng nhập để lưu điểm số và tham gia bảng xếp hạng với người chơi khác!
                        </p>
                        <div className="cta-buttons">
                            <Link to="/login">
                                <button className="btn btn-primary">
                                    🚀 Đăng Nhập
                                </button>
                            </Link>
                            <Link to="/register">
                                <button className="btn btn-secondary">
                                    ✨ Đăng Ký
                                </button>
                            </Link>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Home;
