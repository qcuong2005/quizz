import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getCurrentUser } from '../../services/authService';
import '../../styles/GlobalStyles.css';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import { Eye } from 'lucide-react';

const RenderWithMath = ({ text }) => {
    if (!text) return null;
    const parts = text.split(/(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|(?<!\\)\$[\s\S]*?(?<!\\)\$)/g);
    return (
        <span>
            {parts.map((part, index) => {
                if (part.startsWith('$$') && part.endsWith('$$')) {
                    const math = part.slice(2, -2);
                    return <BlockMath key={index} math={math} />;
                } else if (part.startsWith('\\[') && part.endsWith('\\]')) {
                    const math = part.slice(2, -2);
                    return <BlockMath key={index} math={math} />;
                } else if (part.startsWith('\\(') && part.endsWith('\\)')) {
                    const math = part.slice(2, -2);
                    return <InlineMath key={index} math={math} />;
                } else if (part.startsWith('$') && part.endsWith('$')) {
                    const math = part.slice(1, -1);
                    return <InlineMath key={index} math={math} />;
                } else {
                    return <span key={index}>{part}</span>;
                }
            })}
        </span>
    );
};

const SpectatorView = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = getCurrentUser();

    // Get room info from state or URL
    const { room } = location.state || {};
    // Fallback if accessed via direct URL (might need to fetch room info first in a real app)
    // For now assuming we have room object or basic roomId
    const roomId = room?.roomId;

    const [question, setQuestion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [result, setResult] = useState(null); // Last question result/stats
    const [gameStatus, setGameStatus] = useState('Waiting for game to start...');
    const [leaderboard, setLeaderboard] = useState([]); // Add Leaderboard State

    // WebSocket Client Ref
    const stompClientRef = useRef(null);

    useEffect(() => {
        // REMOVED user check to allow anonymous spectators
        /*
        if (!user) {
            navigate('/login');
            return;
        }
        */

        if (!roomId) {
            alert("Không tìm thấy thông tin phòng!");
            navigate('/');
            return;
        }

        const storedUser = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : null;
        const token = storedUser ? storedUser.token : null;

        const socket = new SockJS('http://localhost:8080/ws-quiz');

        const connectHeaders = {};
        if (token) {
            connectHeaders.Authorization = `Bearer ${token}`;
        }

        const stompClient = new Client({
            webSocketFactory: () => socket,
            connectHeaders: connectHeaders,
            onConnect: () => {
                console.log(`Spectating Room: ${roomId}`);
                setGameStatus('Spectating...');

                // Subscribe to Room Game Events
                stompClient.subscribe(`/topic/room/${roomId}/game`, (message) => {
                    const data = JSON.parse(message.body);

                    if (data.type === 'NEW_QUESTION') {
                        setQuestion(data);
                        setLoading(false);
                        setResult(null); // Clear previous result
                        setGameStatus('Question Active');
                    } else if (data.type === 'PLAYER_SUBMITTED') {
                        // Show visual feedback that user answered
                        console.log(`${data.username} submitted.`);
                        // Could add a toast or highlight user in list if we had their status
                    } else if (data.type === 'ROUND_OVER') {
                        // 1. Update Leaderboard
                        if (data.leaderboard) {
                            setLeaderboard(data.leaderboard);
                        }

                        // 2. Show Result / Correct Answer
                        if (data.correctAnswer) {
                            setResult({
                                correctAnswer: data.correctAnswer,
                                // We don't have a specific "latestAnswer" here, just the correct one
                                latestAnswer: { username: "KẾT THÚC VÒNG", isCorrect: true }
                            });
                        }
                        setGameStatus('Round Over');
                    } else if (data.type === 'GAME_START') {
                        setLoading(true);
                        setGameStatus('Game Starting...');
                    }
                });

                setLoading(false);
            },
            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
                console.error('Additional details: ' + frame.body);
            },
        });

        stompClient.activate();
        stompClientRef.current = stompClient;

        return () => {
            if (stompClient.active) {
                stompClient.deactivate();
            }
        };
    }, [navigate, roomId, user]);

    return (
        <div className="page-wrapper">
            {/* Animated Background (Darker for Spectator) */}
            <div className="animated-bg" style={{ filter: 'grayscale(0.5) brightness(0.7)' }}>
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
                <div className="orb orb-3"></div>
            </div>

            {/* Spectator Header */}
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                padding: '20px 40px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 100,
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
                <button
                    onClick={() => navigate('/')}
                    style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '12px',
                        padding: '10px 15px',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        fontWeight: '600'
                    }}
                >
                    <span>🚪</span> Leave
                </button>

                <div className="glass-card" style={{ padding: '8px 20px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Eye size={20} color="#00d4ff" />
                    <span style={{ fontWeight: 'bold', color: '#00d4ff', textTransform: 'uppercase', letterSpacing: '1px' }}>SPECTATOR MODE</span>
                </div>
            </div>

            <div className="quiz-page" style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', paddingTop: '80px', paddingBottom: '40px' }}>

                {/* Status Bar */}
                <div style={{ marginBottom: '20px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    {gameStatus}
                </div>

                <div className="quiz-game-container" style={{ width: '100%', maxWidth: '900px', padding: '0 20px' }}>

                    {(!question && !loading) && (
                        <div className="glass-card" style={{ padding: '60px', textAlign: 'center' }}>
                            <h2 style={{ color: 'white' }}>Waiting for the next question...</h2>
                            <p style={{ color: 'var(--text-secondary)' }}>Các người chơi đang chuẩn bị hoặc trận đấu chưa bắt đầu.</p>
                        </div>
                    )}

                    {loading && (
                        <div className="glass-card" style={{ padding: '60px', textAlign: 'center', animation: 'pulse 1.5s infinite' }}>
                            <div className="loading-spinner" style={{ margin: '0 auto 20px' }}></div>
                            <h2 style={{ color: 'var(--text-secondary)' }}>Syncing with game... 📡</h2>
                        </div>
                    )}

                    {question && (
                        <>
                            {/* Question Card */}
                            <div className="glass-card" style={{
                                padding: '40px',
                                textAlign: 'center',
                                marginBottom: '40px',
                                boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                                border: '1px solid rgba(255,255,255,0.15)',
                            }}>
                                <h2 style={{ fontSize: '1.8rem', lineHeight: '1.4', fontWeight: '600', color: 'white' }}>
                                    <RenderWithMath text={question.question} />
                                </h2>
                            </div>

                            {/* Options Grid (Read Only) */}
                            <div className="answers-grid" style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '20px',
                            }}>
                                {question.options.map((opt, idx) => {
                                    let btnStyle = {
                                        padding: '25px',
                                        fontSize: '1.1rem',
                                        borderRadius: '16px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        background: 'rgba(255,255,255,0.05)',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        textAlign: 'center',
                                        minHeight: '80px',
                                        opacity: 0.8
                                    };

                                    // Highlight correct answer if we know it
                                    if (result && result.correctAnswer === opt) {
                                        btnStyle.background = 'rgba(0, 255, 136, 0.2)';
                                        btnStyle.borderColor = '#00ff88';
                                        btnStyle.boxShadow = '0 0 20px rgba(0, 255, 136, 0.4)';
                                        btnStyle.opacity = 1;
                                    }

                                    return (
                                        <div
                                            key={idx}
                                            className="glass-card"
                                            style={btnStyle}
                                        >
                                            <RenderWithMath text={opt} />
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {result && result.latestAnswer && (
                        <div style={{
                            marginTop: '30px',
                            padding: '15px 25px',
                            background: 'rgba(0, 0, 0, 0.5)',
                            borderRadius: '50px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '10px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            animation: 'slideUp 0.3s ease-out'
                        }}>
                            <span>📣</span>
                            <span style={{ fontWeight: 'bold', color: 'white' }}>{result.latestAnswer.username}</span>
                            <span style={{ color: 'var(--text-secondary)' }}>vừa trả lời...</span>
                            {result.latestAnswer.isCorrect ? (
                                <span style={{ color: '#00ff88', fontWeight: 'bold' }}>CHÍNH XÁC! ✅</span>
                            ) : (
                                <span style={{ color: '#ff416c', fontWeight: 'bold' }}>SAI RỒI! ❌</span>
                            )}
                        </div>
                    )}
                </div>

                {/* 🏆 LIVE LEADERBOARD SIDEBAR */}
                <div className="spectator-leaderboard" style={{
                    position: 'fixed',
                    right: '20px',
                    top: '120px',
                    width: '300px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '20px',
                    padding: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    zIndex: 50,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                }}>
                    <h3 style={{
                        color: 'white',
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                        paddingBottom: '15px',
                        marginBottom: '15px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '1.1rem'
                    }}>
                        <span>🏆</span> Bảng Xếp Hạng
                    </h3>

                    {leaderboard.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.9rem' }}>Chưa có dữ liệu điểm số...</p>
                    ) : (
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            {leaderboard.map((player, index) => (
                                <li key={player.username} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '12px 15px',
                                    background: index === 0 ? 'linear-gradient(90deg, rgba(255, 215, 0, 0.2), transparent)' : 'rgba(255,255,255,0.03)',
                                    marginBottom: '8px',
                                    borderRadius: '12px',
                                    color: 'white',
                                    border: index === 0 ? '1px solid rgba(255, 215, 0, 0.3)' : 'none',
                                    transition: 'all 0.3s ease'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{
                                            width: '24px',
                                            height: '24px',
                                            background: index < 3 ? ['#FFD700', '#C0C0C0', '#CD7F32'][index] : 'rgba(255,255,255,0.1)',
                                            color: index < 3 ? '#000' : '#fff',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 'bold',
                                            fontSize: '0.8rem'
                                        }}>
                                            {index + 1}
                                        </span>
                                        <span style={{ fontWeight: '500' }}>{player.username}</span>
                                    </div>
                                    <span style={{ fontWeight: 'bold', color: '#00d4ff' }}>{player.score}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SpectatorView;
