import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getCurrentUser } from '../../services/authService';
import '../../styles/GlobalStyles.css';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

// Helper to render text with LaTeX
const RenderWithMath = ({ text }) => {
    if (!text) return null;

    // Pattern to detect LaTeX: 
    // 1. Block: $$...$$ or \[...\]
    // 2. Inline: $...$ or \(...\)
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

const QuizGame = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation(); // Get state passed from RoomWaiting
    const user = getCurrentUser();

    // Game Mode State
    // Try to get from State first, then URL (for refresh resilience)
    const { roomId: stateRoomId, isMultiplayer: stateIsMp, isHost: stateIsHost, topic: stateTopic } = location.state || {};

    // URL params
    const roomParam = searchParams.get('room');
    const hostParam = searchParams.get('host');
    const topicParam = searchParams.get('topic');

    const roomId = stateRoomId || roomParam;
    const isMultiplayer = stateIsMp || !!roomParam;
    const isHost = stateIsHost !== undefined ? stateIsHost : (hostParam === 'true');
    const topic = stateTopic || topicParam;

    const [question, setQuestion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [result, setResult] = useState(null);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(15);

    // NEW: Suspense Mode States
    const [showResult, setShowResult] = useState(false);
    const [hasSubmitted, setHasSubmitted] = useState(false);

    // WebSocket Client Ref
    const stompClientRef = useRef(null);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        const storedUser = JSON.parse(localStorage.getItem("user"));
        const token = storedUser ? storedUser.token : null;

        if (!token) {
            console.error("No token found for WebSocket");
            navigate('/login');
            return;
        }

        const socket = new SockJS('http://localhost:8080/ws-quiz');
        const stompClient = new Client({
            webSocketFactory: () => socket,
            connectHeaders: {
                Authorization: `Bearer ${token}`
            },
            onConnect: () => {
                if (isMultiplayer) {
                    // --- MULTIPLAYER MODE ---
                    console.log(`Connected to Multiplayer Room: ${roomId}`);

                    // 1. Subscribe to PUBLIC Room Events
                    stompClient.subscribe(`/topic/room/${roomId}/game`, (message) => {
                        const data = JSON.parse(message.body);

                        if (data.type === 'NEW_QUESTION') {
                            setQuestion(data);
                            setLoading(false);
                            setTimeLeft(15);
                            setResult(null);
                            setShowResult(false);
                            setHasSubmitted(false);
                        } else if (data.type === 'PLAYER_SUBMITTED') {
                            // Optional: Show "User X has answered" toast
                            console.log(`User ${data.username} submitted`);
                        } else if (data.type === 'ROUND_OVER') {
                            // Handle Round Over (e.g., show comprehensive leaderboard?)
                            console.log("Round Over", data);
                        }
                    });

                    // 2. Subscribe to PRIVATE User Events (For secure result)
                    stompClient.subscribe(`/user/queue/private`, (message) => {
                        const data = JSON.parse(message.body);
                        if (data.type === 'ANSWER_RESULT') {
                            const isTimeout = timeLeftRef.current <= 0;
                            setResult({
                                message: isTimeout ? "⏰ Hết giờ!" : (data.isCorrect ? `Chính xác! +${data.scoreAdded}` : "Sai rồi!"),
                                score: data.scoreAdded,
                                isCorrect: data.isCorrect,
                                correctAnswer: data.correctAnswer
                            });
                            if (data.scoreAdded > 0) setScore(prev => prev + data.scoreAdded);
                            setShowResult(true);
                        }
                    });

                    // Multiplayer: Wait for host/server to send first question
                    setLoading(true);

                } else {
                    // --- SINGLE PLAYER MODE ---
                    stompClient.subscribe('/topic/quiz', (message) => {
                        try {
                            const receivedQuestion = JSON.parse(message.body);
                            if (receivedQuestion.error) {
                                setLoading(false);
                                alert("AI Error: " + receivedQuestion.error);
                                return;
                            }
                            setQuestion(receivedQuestion);
                            setLoading(false);
                            setTimeLeft(15);
                            setResult(null);
                            setShowResult(false);
                            setHasSubmitted(false);
                        } catch (e) {
                            setLoading(false);
                            alert("Lỗi khi xử lý câu hỏi từ AI.");
                        }
                    });

                    stompClient.subscribe('/topic/score', (message) => {
                        const resultData = JSON.parse(message.body);
                        if (resultData.username === user.username) {
                            setResult(resultData);
                            if (resultData.score > 0) {
                                setScore(prev => prev + resultData.score);
                            }
                        }
                    });

                    // Start Game immediately
                    requestQuestion(stompClient, topic);
                }
            },
            onStompError: (frame) => {
                if (frame.headers['message']?.includes("chưa đăng nhập")) {
                    navigate('/login');
                }
            },
        });

        stompClient.activate();
        stompClientRef.current = stompClient;

        return () => {
            if (stompClient.active) {
                stompClient.deactivate();
            }
        };
        // eslint-disable-next-line
    }, [topic, navigate, isMultiplayer, roomId]);

    // Timer Logic
    const timeLeftRef = useRef(15);
    useEffect(() => {
        timeLeftRef.current = timeLeft;
        // If loading or if result is ALREADY shown, stop timer
        if (loading || showResult) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                const newValue = prev - 1;
                timeLeftRef.current = newValue; // Sync ref immediately
                if (newValue < 0) { // Slight buffer: < 0 instead of <= 1 to ensure 0 is shown? 
                    // Wait, existing logic: if prev <= 1 -> return 0.
                    // Let's keep existing logic but update ref.
                    clearInterval(timer);
                    handleTimeOut();
                    return 0;
                }
                return newValue;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [loading, showResult]);

    // Power-ups State
    const [powerUps, setPowerUps] = useState({
        fiftyFifty: 1,
        doubleScore: 1,
        extraTime: 1,
        secondChance: 1
    });

    const [used5050, setUsed5050] = useState(false);
    const [hiddenOptions, setHiddenOptions] = useState([]);
    const [isDoubleScoreActive, setIsDoubleScoreActive] = useState(false);
    const [isSecondChanceActive, setIsSecondChanceActive] = useState(false);
    const [hasRetried, setHasRetried] = useState(false);

    // Power-up Handlers
    const handle5050 = () => {
        if (powerUps.fiftyFifty <= 0 || used5050 || !question || hasSubmitted) return;
        const wrongOptions = question.options.filter(opt => opt !== question.correctAnswer);
        const shuffled = wrongOptions.sort(() => 0.5 - Math.random());
        const toHide = shuffled.slice(0, 2);
        setHiddenOptions(toHide);
        setUsed5050(true);
        setPowerUps(prev => ({ ...prev, fiftyFifty: prev.fiftyFifty - 1 }));
    };

    const handleDoubleScore = () => {
        if (powerUps.doubleScore <= 0 || isDoubleScoreActive || hasSubmitted) return;
        setIsDoubleScoreActive(true);
        setPowerUps(prev => ({ ...prev, doubleScore: prev.doubleScore - 1 }));
    };

    const handleExtraTime = () => {
        if (powerUps.extraTime <= 0 || hasSubmitted || showResult) return;
        setTimeLeft(prev => prev + 5);
        setPowerUps(prev => ({ ...prev, extraTime: prev.extraTime - 1 }));
    };

    const handleSecondChance = () => {
        if (powerUps.secondChance <= 0 || isSecondChanceActive || hasSubmitted) return;
        setIsSecondChanceActive(true);
        setPowerUps(prev => ({ ...prev, secondChance: prev.secondChance - 1 }));
    };

    const requestQuestion = (client, topicName) => {
        setLoading(true);
        setUsed5050(false);
        setHiddenOptions([]);
        setIsDoubleScoreActive(false);
        setIsSecondChanceActive(false);
        setHasRetried(false);
        setHasSubmitted(false);
        setShowResult(false);

        if (client && client.active) {
            client.publish({
                destination: '/app/get-question',
                body: topicName
            });
        }
    };

    const handleAnswer = (selectedAns) => {
        if (!question || hasSubmitted) return;

        const isCorrect = selectedAns === question.correctAnswer;
        if (selectedAns !== "TIMEOUT" && !isCorrect && isSecondChanceActive && !hasRetried && !isMultiplayer) {
            // Second chance only available in Single Player for now? Or sync it?
            // Let's allow it locally but backend might not know. 
            // For multiplayer simplicity, let's keep powerups local or disable them.
            // Let's assume they work locally for now.
            alert("🛡️ Second Chance! Bạn được chọn lại một lần nữa.");
            setHasRetried(true);
            return;
        }

        setHasSubmitted(true); // Lock inputs immediately

        const payload = {
            userAnswer: selectedAns,
            correctAnswer: question.correctAnswer,
            timeLeft: timeLeft,
            useDoubleScore: isDoubleScoreActive,
            isRetry: hasRetried
        };

        if (stompClientRef.current) {
            if (isMultiplayer) {
                stompClientRef.current.publish({
                    destination: `/app/room/${roomId}/submit`,
                    body: JSON.stringify(payload)
                });
            } else {
                stompClientRef.current.publish({
                    destination: '/app/check-answer',
                    body: JSON.stringify(payload)
                });
            }
        }
    };

    const handleNextQuestion = () => {
        if (isMultiplayer) {
            if (isHost && stompClientRef.current) {
                // Host triggers next question
                stompClientRef.current.publish({
                    destination: `/app/room/${roomId}/next-question`,
                    body: topic
                });
            } else {
                // Guest waits
                alert("Chờ chủ phòng chuyển câu tiếp theo...");
            }
        } else {
            requestQuestion(stompClientRef.current, topic);
        }
    };

    const handleTimeOut = () => {
        // If user hasn't answered, force submit a wrong answer to get the correct one from server
        if (!hasSubmitted) {
            handleAnswer("TIMEOUT");
        }
        setShowResult(true);
    };

    const handleSkip = () => {
        setShowResult(true);
    };

    // Timer color logic
    const getTimerClass = () => {
        if (timeLeft <= 3) return 'danger';
        if (timeLeft <= 7) return 'warning';
        return '';
    };

    return (
        <div className="page-wrapper">
            {/* Animated Background */}
            <div className="animated-bg">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
                <div className="orb orb-3"></div>
            </div>

            {/* Floating Header */}
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
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
                pointerEvents: 'none'
            }}>
                {/* Back Button */}
                <button
                    onClick={() => navigate('/')}
                    style={{
                        background: 'rgba(255,255,255,0.1)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '12px',
                        padding: '10px 15px',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        pointerEvents: 'auto',
                        transition: 'all 0.3s ease',
                        fontWeight: '600'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
                    onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                >
                    <span>🏠</span> Exit
                </button>

                {/* Score & Streak */}
                <div style={{ display: 'flex', gap: '15px', pointerEvents: 'auto' }}>
                    <div className="glass-card" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '20px' }}>
                        <span style={{ fontSize: '1.2rem' }}>🏆</span>
                        <span style={{ fontWeight: '800', fontSize: '1.1rem' }}>{score}</span>
                    </div>
                    {score > 0 && result && result.streak > 1 && (
                        <div className="glass-card" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '20px', background: 'rgba(255, 107, 53, 0.2)', borderColor: '#ff6b35' }}>
                            <span style={{ fontSize: '1.2rem' }}>🔥</span>
                            <span style={{ fontWeight: '800', fontSize: '1.1rem', color: '#ff6b35' }}>{result.streak}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="quiz-page" style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', paddingTop: '80px', paddingBottom: '40px' }}>

                {/* Timer Bar */}
                <div style={{ width: '100%', maxWidth: '800px', marginBottom: '30px', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                        <span>Time Left</span>
                        <span style={{ color: timeLeft <= 5 ? '#ff4b2b' : 'white' }}>{timeLeft}s</span>
                    </div>

                    {/* SKIP BUTTON */}
                    {hasSubmitted && !showResult && (
                        <button
                            onClick={handleSkip}
                            className="btn-primary"
                            style={{
                                position: 'absolute',
                                top: '-5px',
                                right: '0',
                                transform: 'translateY(-100%)',
                                padding: '6px 16px',
                                fontSize: '0.9rem',
                                borderRadius: '20px',
                                cursor: 'pointer',
                                zIndex: 200,
                                background: 'var(--accent-cyan)',
                                border: 'none',
                                color: '#000',
                                fontWeight: 'bold',
                                animation: 'pulse 1.5s infinite',
                                boxShadow: '0 0 15px rgba(0, 212, 255, 0.5)'
                            }}
                        >
                            ⏩ SKIP
                        </button>
                    )}

                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                            style={{
                                height: '100%',
                                width: `${(timeLeft / 15) * 100}%`,
                                background: timeLeft <= 5 ? 'var(--btn-red)' : timeLeft <= 10 ? 'var(--btn-yellow)' : 'var(--btn-green)',
                                transition: 'width 1s linear, background 0.3s ease'
                            }}
                        ></div>
                    </div>
                </div>

                <div className="quiz-game-container" style={{ width: '100%', maxWidth: '900px', padding: '0 20px' }}>

                    {/* Main Game Area */}
                    {loading ? (
                        <div className="glass-card" style={{ padding: '60px', textAlign: 'center', animation: 'pulse 1.5s infinite' }}>
                            <div className="loading-spinner" style={{ margin: '0 auto 20px' }}></div>
                            <h2 style={{ color: 'var(--text-secondary)' }}>Generating Question... 🤖</h2>
                        </div>
                    ) : question ? (
                        <>
                            {/* Question Card */}
                            <div className="glass-card" style={{
                                padding: '40px',
                                textAlign: 'center',
                                marginBottom: '40px',
                                boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                animation: 'slideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)'
                            }}>
                                <h2 style={{ fontSize: '1.8rem', lineHeight: '1.4', fontWeight: '600', color: 'white' }}>
                                    <RenderWithMath text={question.question} />
                                </h2>
                            </div>

                            {/* Options Grid */}
                            <div className="answers-grid" style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '20px',
                                perspective: '1000px'
                            }}>
                                {question.options.map((opt, idx) => {
                                    if (hiddenOptions.includes(opt)) {
                                        return <div key={idx} style={{ opacity: 0 }}></div>;
                                    }

                                    let btnStyle = {
                                        padding: '25px',
                                        fontSize: '1.1rem',
                                        borderRadius: '16px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        background: 'rgba(255,255,255,0.05)',
                                        color: 'white',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        textAlign: 'center',
                                        minHeight: '80px',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    };

                                    let specialClass = '';
                                    if (showResult && result) {
                                        // Use result.correctAnswer if available (Multiplayer), else question.correctAnswer
                                        const correctAns = result.correctAnswer || question.correctAnswer;

                                        if (opt === correctAns) {
                                            btnStyle.background = 'rgba(0, 255, 136, 0.2)';
                                            btnStyle.borderColor = '#00ff88';
                                            btnStyle.boxShadow = '0 0 20px rgba(0, 255, 136, 0.4)';
                                            btnStyle.transform = 'scale(1.02)';
                                        } else if (opt === result.userAnswer) {
                                            if (result.isCorrect) {
                                                // Should have been caught above if user answer == correct answer
                                                // But if for some reason logic differs, safe fallback:
                                                btnStyle.background = 'rgba(0, 255, 136, 0.2)';
                                                btnStyle.borderColor = '#00ff88';
                                            } else {
                                                btnStyle.background = 'rgba(255, 65, 108, 0.2)';
                                                btnStyle.borderColor = '#ff416c';
                                                btnStyle.opacity = '0.8';
                                            }
                                        } else {
                                            btnStyle.opacity = '0.5';
                                        }
                                    } else {
                                        if (hasSubmitted) {
                                            // Actively dim if waiting
                                            btnStyle.opacity = '0.6';
                                            btnStyle.cursor = 'wait';
                                            btnStyle.borderColor = 'rgba(255,255,255,0.05)';
                                        } else {
                                            specialClass = 'answer-option';
                                        }
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            className={`glass-card ${specialClass}`}
                                            style={btnStyle}
                                            onClick={() => handleAnswer(opt)}
                                            disabled={hasSubmitted}
                                        >
                                            <RenderWithMath text={opt} />
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Power-ups Dock */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                gap: '15px',
                                marginTop: '40px',
                                opacity: (hasSubmitted || showResult) ? 0.3 : 1,
                                transition: 'opacity 0.3s',
                                pointerEvents: (hasSubmitted || showResult) ? 'none' : 'auto'
                            }}>
                                <button className={`btn-icon glass-card ${used5050 ? 'disabled' : ''}`} onClick={handle5050} disabled={used5050 || hasSubmitted || powerUps.fiftyFifty === 0} title="50/50" style={{ width: '60px', height: '60px', borderRadius: '50%', fontSize: '1.5rem', opacity: powerUps.fiftyFifty === 0 ? 0.3 : 1 }}>
                                    ⚖️ <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'var(--accent-purple)', fontSize: '0.7rem', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{powerUps.fiftyFifty}</span>
                                </button>
                                <button className={`btn-icon glass-card ${isDoubleScoreActive ? 'active-powerup' : ''}`} onClick={handleDoubleScore} disabled={isDoubleScoreActive || hasSubmitted || powerUps.doubleScore === 0} title="x2 Score" style={{ width: '60px', height: '60px', borderRadius: '50%', fontSize: '1.5rem', opacity: powerUps.doubleScore === 0 ? 0.3 : 1, border: isDoubleScoreActive ? '2px solid #ffd700' : 'none' }}>
                                    ✖️2 <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'var(--accent-purple)', fontSize: '0.7rem', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{powerUps.doubleScore}</span>
                                </button>
                                <button className="btn-icon glass-card" onClick={handleExtraTime} disabled={hasSubmitted || powerUps.extraTime === 0} title="+5s Time" style={{ width: '60px', height: '60px', borderRadius: '50%', fontSize: '1.5rem', opacity: powerUps.extraTime === 0 ? 0.3 : 1 }}>
                                    ⏳ <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'var(--accent-purple)', fontSize: '0.7rem', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{powerUps.extraTime}</span>
                                </button>
                                <button className={`btn-icon glass-card ${isSecondChanceActive ? 'active-powerup' : ''}`} onClick={handleSecondChance} disabled={isSecondChanceActive || hasSubmitted || powerUps.secondChance === 0} title="Second Chance" style={{ width: '60px', height: '60px', borderRadius: '50%', fontSize: '1.5rem', opacity: powerUps.secondChance === 0 ? 0.3 : 1, border: isSecondChanceActive ? '2px solid #00ff88' : 'none' }}>
                                    🛡️ <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'var(--accent-purple)', fontSize: '0.7rem', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{powerUps.secondChance}</span>
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: '#ff6b8a' }}>
                            ⚠️ Connection Lost. Please try again.
                        </div>
                    )}

                    {/* Result Overlay */}
                    {showResult && result && (
                        <div style={{
                            position: 'fixed',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'rgba(10, 10, 26, 0.95)',
                            backdropFilter: 'blur(30px)',
                            padding: '30px',
                            borderTop: `4px solid ${result.score > 0 ? '#00ff88' : '#ff416c'}`,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            zIndex: 1000,
                            animation: 'slideUp 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)'
                        }}>
                            <h2 style={{
                                fontSize: '2rem',
                                color: result.score > 0 ? '#00ff88' : '#ff416c',
                                marginBottom: '10px'
                            }}>
                                {result.message}
                            </h2>
                            {result.streakBonus > 0 && (
                                <p style={{ color: '#ffd700', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '20px' }}>
                                    🔥 Streak Bonus: +{result.streakBonus}
                                </p>
                            )}

                            {/* Explanation Section */}
                            {question && question.explanation && (
                                <div style={{
                                    width: '100%',
                                    maxWidth: '800px',
                                    marginBottom: '20px',
                                    padding: '20px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    textAlign: 'left'
                                }}>
                                    <h4 style={{ color: 'var(--accent-cyan)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        💡 Explanation
                                    </h4>
                                    <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                        <RenderWithMath text={question.explanation} />
                                    </p>
                                </div>
                            )}

                            {(!isMultiplayer || (isMultiplayer && isHost)) ? (
                                <button
                                    className="btn btn-primary"
                                    onClick={handleNextQuestion}
                                    style={{
                                        padding: '15px 40px',
                                        fontSize: '1.2rem',
                                        borderRadius: '50px',
                                        boxShadow: '0 0 20px rgba(0, 212, 255, 0.4)',
                                        animation: 'pulse 2s infinite'
                                    }}
                                >
                                    Next Question ➡️
                                </button>
                            ) : (
                                <div style={{
                                    padding: '15px 30px',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    borderRadius: '30px',
                                    color: 'var(--accent-cyan)',
                                    fontWeight: '600',
                                    fontSize: '1.1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px'
                                }}>
                                    <div className="loading-spinner" style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'var(--accent-cyan)' }}></div>
                                    Waiting for host...
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick CSS for hover effects that inline styles miss */}
            <style>{`
                .answer-option:hover {
                    background: rgba(255,255,255,0.1) !important;
                    transform: translateY(-2px);
                    border-color: rgba(255,255,255,0.3) !important;
                }
                .active-powerup {
                    animation: glow 1.5s infinite alternate;
                }
            `}</style>
        </div >
    );
};

export default QuizGame;
