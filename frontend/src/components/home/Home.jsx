import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentUser, logout, refreshUserData } from '../../services/authService';
import Header from '../layout/Header';
import '../../styles/GlobalStyles.css';
import { Calculator, Atom, BookOpen, Landmark, Globe, Languages, BrainCircuit, Scroll, Sun, CloudRain, Leaf, Snowflake, Sparkles, Search, Trophy, Flame, Star, Target } from 'lucide-react';

const Home = () => {
    const [user, setUser] = useState(null);
    const navigate = useNavigate();
    const [theme, setTheme] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Detect season
    useEffect(() => {
        const currentUser = getCurrentUser();
        setUser(currentUser);

        // Always fetch fresh data from server
        if (currentUser) {
            refreshUserData().then(updated => {
                if (updated) setUser(updated);
            });
        }

        const month = new Date().getMonth(); // 0-11
        let seasonTheme = '';

        if (month >= 2 && month <= 4) seasonTheme = 'theme-spring'; // Mar-May
        else if (month >= 5 && month <= 7) seasonTheme = 'theme-summer'; // Jun-Aug
        else if (month >= 8 && month <= 10) seasonTheme = 'theme-autumn'; // Sep-Nov
        else seasonTheme = 'theme-winter'; // Dec-Feb

        setTheme(seasonTheme);
    }, []);

    const themes = [
        { id: 'theme-spring', name: 'Xuân', icon: <CloudRain size={18} />, color: '#ff9a9e', bg: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' },
        { id: 'theme-summer', name: 'Hè', icon: <Sun size={18} />, color: '#f09819', bg: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)' },
        { id: 'theme-autumn', name: 'Thu', icon: <Leaf size={18} />, color: '#d4fc79', bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
        { id: 'theme-winter', name: 'Đông', icon: <Snowflake size={18} />, color: '#a1c4fd', bg: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)' },
    ];

    // Topics with icons
    // Topics with icons and colors
    const TOPICS = [
        { name: "Toán", icon: <Calculator size={48} />, desc: "Số học, hình học", color: "from-blue-500 to-cyan-400" },
        { name: "Vật Lý", icon: <Atom size={48} />, desc: "Cơ, Nhiệt, Điện, Quang", color: "from-purple-500 to-indigo-500" },
        { name: "Văn", icon: <BookOpen size={48} />, desc: "Văn học, ngữ pháp", color: "from-pink-500 to-rose-400" },
        { name: "Sử", icon: <Landmark size={48} />, desc: "Lịch sử Việt Nam & thế giới", color: "from-amber-600 to-yellow-500" },
        { name: "Địa", icon: <Globe size={48} />, desc: "Địa lý tự nhiên", color: "from-emerald-500 to-teal-400" },
        { name: "Tiếng Anh", icon: <Languages size={48} />, desc: "Vocabulary, Grammar", color: "from-sky-500 to-blue-600" },
        { name: "Đố mẹo", icon: <BrainCircuit size={48} />, desc: "Đánh lừa tư duy", color: "from-violet-500 to-fuchsia-500" },
        { name: "Đố dân gian", icon: <Scroll size={48} />, desc: "Tri thức dân gian", color: "from-red-500 to-orange-500" }
    ];

    // Filter topics based on search
    const filteredTopics = TOPICS.filter(topic =>
        topic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        topic.desc.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleTopicClick = (topic) => {
        navigate(`/quiz?topic=${topic}`);
    };



    return (
        <div className={`page-wrapper ${theme}`}>
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

                {/* Theme Selector - Positioned below fixed header (which is ~80px) */}
                <div style={{ position: 'absolute', top: '100px', right: '20px', zIndex: 100, display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '30px', backdropFilter: 'blur(10px)' }}>
                    {themes.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setTheme(t.id)}
                            title={`Giao diện Mùa ${t.name}`}
                            style={{
                                background: theme === t.id ? t.bg : 'transparent',
                                border: 'none',
                                borderRadius: '50%',
                                width: '36px',
                                height: '36px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                boxShadow: theme === t.id ? '0 4px 12px rgba(0,0,0,0.3)' : 'none',
                                transform: theme === t.id ? 'scale(1.1)' : 'scale(1)'
                            }}
                        >
                            {t.icon}
                        </button>
                    ))}
                    <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)', margin: '0 4px' }}></div>
                    <div title="Tự động theo mùa" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', color: 'rgba(255,255,255,0.7)' }}>
                        <Sparkles size={16} />
                    </div>
                </div>

                {/* Hero Section - Redesigned */}
                <section className="hero-section">
                    <div className="hero-content">
                        {/* Left Column: Text & CTA */}
                        <div className="hero-text">
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.1)', padding: '6px 16px', borderRadius: '20px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <Sparkles size={16} color="#FFD700" />
                                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#FFD700' }}>Phiên bản Pro 2.0</span>
                            </div>
                            <h1 className="hero-title">
                                Chinh phục <br />
                                <span style={{ fontSize: '0.8em', opacity: 0.9 }}>Tri thức vô tận</span>
                            </h1>
                            <p className="hero-subtitle">
                                "Không có tài sản nào quý giá hơn trí tuệ, không có vinh quang nào lớn hơn học vấn."
                            </p>
                            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                <button className="btn btn-primary" onClick={() => document.getElementById('topics-grid')?.scrollIntoView({ behavior: 'smooth' })}>
                                    Chơi ngay <Flame size={20} />
                                </button>
                                <button className="btn btn-secondary" onClick={() => navigate('/room')}>
                                    🎮 Multiplayer
                                </button>
                                <button className="btn btn-ghost" onClick={() => navigate('/leaderboard')}>
                                    Bảng xếp hạng <Trophy size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Right Column: Player Stats Card */}
                        <div className="hero-stats">
                            <div className="stats-card">
                                <div className="stats-header">
                                    <div className="stats-avatar">
                                        {user ? user.username.charAt(0).toUpperCase() : 'G'}
                                    </div>
                                    <div className="stats-info">
                                        <h2>{user ? user.username : 'Guest Player'}</h2>
                                        <span className="stats-badge">{user?.rankName || 'Học viên mới'}</span>
                                    </div>
                                </div>
                                <div className="stats-grid">
                                    <div className="stat-item">
                                        <span className="stat-value" style={{ color: '#4facfe' }}>
                                            {user?.totalScore?.toLocaleString() || 0}
                                        </span>
                                        <span className="stat-label">Tổng điểm</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-value" style={{ color: '#ff9a9e' }}>
                                            {user?.streak || 0}
                                        </span>
                                        <span className="stat-label">Chuỗi thắng</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-value" style={{ color: '#f093fb' }}>
                                            {user?.gamesPlayed || 0}
                                        </span>
                                        <span className="stat-label">Câu hỏi</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-value" style={{ color: '#ffd700' }}>
                                            {user?.rank ? '#' + user.rank : '#---'}
                                        </span>
                                        <span className="stat-label">Xếp hạng</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Search Section */}
                <div className="search-section">
                    <div className="search-input-wrapper">
                        <Search className="search-icon" size={24} />
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Tìm kiếm chủ đề của bạn..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="topics-section" id="topics-grid">
                    <h2 style={{ textAlign: 'center', marginBottom: '32px', fontSize: '2rem', fontWeight: 700 }}>
                        ✨ Khám phá chủ đề
                    </h2>
                    <div className="topics-grid">
                        {filteredTopics.map((topic, index) => (
                            <div
                                key={topic.name}
                                className="topic-card"
                                onClick={() => handleTopicClick(topic.name)}
                                style={{
                                    animationDelay: `${index * 0.05}s`,
                                    '--card-gradient': `linear-gradient(135deg, var(--color-${index}), var(--color-${index}-dark))`
                                }}
                                data-color-index={index}
                            >
                                <span className="topic-icon">{topic.icon}</span>
                                <span className="topic-name">{topic.name}</span>
                                <span className="topic-desc" style={{ display: 'block', fontSize: '0.85rem', opacity: 0.8, marginTop: '5px' }}>
                                    {topic.desc}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
                {user ? (
                    <>
                        {/* User Welcome and old Topics Grid removed */}
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
