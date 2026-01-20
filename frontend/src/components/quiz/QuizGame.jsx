import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getCurrentUser, refreshUserData } from '../../services/authService';
import '../../styles/GlobalStyles.css';
import './QuizGame.css';
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
    const [score, setScore] = useState(isMultiplayer ? 0 : (user?.totalScore || 0));

    const [timeLeft, setTimeLeft] = useState(15);
    const [sessionHistory, setSessionHistory] = useState([]); // Store Q&A history
    const [showReviewBoard, setShowReviewBoard] = useState(false); // Toggle Review UI

    // NEW: Suspense Mode States
    const [showResult, setShowResult] = useState(false);
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [selectedOption, setSelectedOption] = useState(null); // NEW: Track selected option
    const [roundLeaderboard, setRoundLeaderboard] = useState(null);

    // NEW: Fetch fresh score on mount
    useEffect(() => {
        if (user && user.token) {
            refreshUserData().then(updatedUser => {
                if (updatedUser) {
                    console.log("Initial user data refreshed:", updatedUser.totalScore);
                    setScore(updatedUser.totalScore);
                }
            });
        }
    }, []);

    const stompClientRef = useRef(null);
    const questionRef = useRef(null); // Ref to access current question in callbacks

    useEffect(() => {
        questionRef.current = question;
    }, [question]);

    // Refresh user data when result is shown
    useEffect(() => {
        if (showResult) {
            refreshUserData().then(updatedUser => {
                console.log("User data refreshed:", updatedUser?.totalScore);
            });
        }
    }, [showResult]);

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
                            setTimeLeft(45);
                            setResult(null);
                            setShowResult(false);
                            setShowResult(false);
                            setHasSubmitted(false);
                            setRoundLeaderboard(null);
                            setSelectedOption(null); // Reset selection
                        } else if (data.type === 'PLAYER_SUBMITTED') {
                            // Optional: Show "User X has answered" toast
                            console.log(`User ${data.username} submitted`);
                        } else if (data.type === 'ROUND_OVER') {
                            // Handle Round Over
                            console.log("Round Over", data);
                            setRoundLeaderboard(data.leaderboard);
                            if (!showResult) {
                                setShowResult(true); // Force show result if not already
                            }
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
                                correctAnswer: data.correctAnswer,
                                totalScore: data.totalScore // Sync total score
                            });

                            // Update local running score
                            if (data.totalScore !== undefined) {
                                setScore(data.totalScore);
                            } else if (data.scoreAdded > 0) {
                                setScore(prev => prev + data.scoreAdded);
                            }

                            // Add to history
                            const currentQ = questionRef.current;
                            if (currentQ) {
                                setSessionHistory(prev => [
                                    ...prev,
                                    {
                                        question: currentQ,
                                        userAnswer: data.userAnswer || "TIMEOUT",
                                        correctAnswer: data.correctAnswer,
                                        isCorrect: data.isCorrect,
                                        explanation: currentQ.explanation,
                                        resultMessage: isTimeout ? "⏰ Hết giờ!" : (data.isCorrect ? "Đúng" : "Sai")
                                    }
                                ]);
                            }

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
                            setTimeLeft(45); // Fixed time limit
                            setResult(null);
                            setShowResult(false);
                            setHasSubmitted(false);
                            setSelectedOption(null); // Reset selection
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

                            // Add to history
                            const currentQ = questionRef.current;
                            if (currentQ) {
                                setSessionHistory(prev => [
                                    ...prev,
                                    {
                                        question: currentQ,
                                        userAnswer: resultData.userAnswer || (timeLeftRef.current <= 0 ? "TIMEOUT" : "UNKNOWN"),
                                        correctAnswer: resultData.correctAnswer,
                                        isCorrect: resultData.isCorrect,
                                        explanation: currentQ.explanation,
                                        resultMessage: resultData.message
                                    }
                                ]);
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
                if (newValue < 0) { // Slight buffer
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
        setRoundLeaderboard(null);
        setSelectedOption(null); // Reset selection

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
            alert("🛡️ Second Chance! Bạn được chọn lại một lần nữa.");
            setHasRetried(true);
            return;
        }

        setSelectedOption(selectedAns); // Set selected option immediately
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
            <div className="quiz-header">
                {/* Back Button */}
                <button
                    onClick={async () => {
                        // If we have history, show proper review board, else just exit
                        if (sessionHistory.length > 0) {
                            setShowReviewBoard(true);
                        } else {
                            await refreshUserData();
                            navigate('/');
                        }
                    }}
                    className="exit-btn"
                    onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
                    onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                >
                    <span>🏠</span> Thoát
                </button>

                {/* Score & Streak */}
                <div style={{ display: 'flex', gap: '15px', pointerEvents: 'auto' }}>
                    <div className="glass-card score-badge">
                        <span style={{ fontSize: '1.2rem' }}>🏆</span>
                        <span style={{ fontWeight: '800', fontSize: '1.1rem' }}>{score}</span>
                    </div>
                    {score > 0 && result && result.streak > 1 && (
                        <div className="glass-card score-badge streak-badge">
                            <span style={{ fontSize: '1.2rem' }}>🔥</span>
                            <span style={{ fontWeight: '800', fontSize: '1.1rem', color: '#ff6b35' }}>{result.streak}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="quiz-page">

                {/* Timer Bar */}
                <div className="timer-container">
                    <div className="timer-labels">
                        <span>Thời gian còn lại</span>
                        <span style={{ color: timeLeft <= 5 ? '#ff4b2b' : 'white' }}>{timeLeft}s</span>
                    </div>

                    {/* SKIP BUTTON */}
                    {hasSubmitted && !showResult && (
                        <button
                            onClick={handleSkip}
                            className="skip-btn"
                        >
                            ⏩ BỎ QUA
                        </button>
                    )}

                    <div className="timer-track track-bg">
                        <div
                            className="timer-fill"
                            style={{
                                width: `${(timeLeft / 45) * 100}%`,
                                background: timeLeft <= 5 ? 'var(--btn-red)' : timeLeft <= 10 ? 'var(--btn-yellow)' : 'var(--btn-green)'
                            }}
                        ></div>
                    </div>
                </div>

                <div className="quiz-game-container">

                    {/* Main Game Area */}
                    {loading ? (
                        <div className="glass-card" style={{ padding: '60px', textAlign: 'center', animation: 'pulse 1.5s infinite' }}>
                            <div className="loading-spinner" style={{ margin: '0 auto 20px' }}></div>
                            <h2 style={{ color: 'var(--text-secondary)' }}>Đang tạo câu hỏi... 🤖</h2>
                        </div>
                    ) : question ? (
                        <>
                            {/* Question Card */}
                            <div className="glass-card question-card">
                                <h2 className="question-text">
                                    <RenderWithMath text={question.question} />
                                </h2>
                            </div>

                            {/* Options Grid */}
                            <div className="answers-grid">
                                {question.options.map((opt, idx) => {
                                    if (hiddenOptions.includes(opt)) {
                                        return <div key={idx} style={{ opacity: 0 }}></div>;
                                    }

                                    let specialClass = 'answer-option';
                                    let btnStyle = {};

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
                                            if (opt === selectedOption) {
                                                // Keep selected option highly visible and highlighted
                                                btnStyle.opacity = '1';
                                                btnStyle.background = 'rgba(0, 212, 255, 0.2)'; // Light cyan tint
                                                btnStyle.borderColor = 'var(--accent-cyan)';
                                                btnStyle.boxShadow = '0 0 10px rgba(0, 212, 255, 0.3)';
                                            } else {
                                                // Dim others but keep visible enough to read
                                                btnStyle.opacity = '0.5';
                                                btnStyle.borderColor = 'rgba(255,255,255,0.1)';
                                            }
                                            btnStyle.cursor = 'wait';
                                        }
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            className={`glass-card ${specialClass}`}
                                            // Keep dynamic styles for correct/wrong state
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
                            <div className="powerups-dock" style={{
                                opacity: (hasSubmitted || showResult) ? 0.3 : 1,
                                pointerEvents: (hasSubmitted || showResult) ? 'none' : 'auto'
                            }}>
                                <button className={`btn-icon glass-card powerup-btn ${used5050 ? 'disabled' : ''}`} onClick={handle5050} disabled={used5050 || hasSubmitted || powerUps.fiftyFifty === 0} title="50/50" style={{ opacity: powerUps.fiftyFifty === 0 ? 0.3 : 1 }}>
                                    ⚖️ <span className="powerup-count">{powerUps.fiftyFifty}</span>
                                </button>
                                <button className={`btn-icon glass-card powerup-btn ${isDoubleScoreActive ? 'active-powerup' : ''}`} onClick={handleDoubleScore} disabled={isDoubleScoreActive || hasSubmitted || powerUps.doubleScore === 0} title="x2 Score" style={{ opacity: powerUps.doubleScore === 0 ? 0.3 : 1 }}>
                                    ✖️2 <span className="powerup-count">{powerUps.doubleScore}</span>
                                </button>
                                <button className="btn-icon glass-card powerup-btn" onClick={handleExtraTime} disabled={hasSubmitted || powerUps.extraTime === 0} title="+5s Time" style={{ opacity: powerUps.extraTime === 0 ? 0.3 : 1 }}>
                                    ⏳ <span className="powerup-count">{powerUps.extraTime}</span>
                                </button>
                                <button className={`btn-icon glass-card powerup-btn ${isSecondChanceActive ? 'active-powerup' : ''}`} onClick={handleSecondChance} disabled={isSecondChanceActive || hasSubmitted || powerUps.secondChance === 0} title="Second Chance" style={{ opacity: powerUps.secondChance === 0 ? 0.3 : 1, border: isSecondChanceActive ? '2px solid #00ff88' : 'none' }}>
                                    🛡️ <span className="powerup-count">{powerUps.secondChance}</span>
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
                        <div className={`result-overlay ${result.score > 0 ? 'correct' : 'wrong'}`}>
                            <h2 className="result-title" style={{ color: result.score > 0 ? '#00ff88' : '#ff416c' }}>
                                {result.message}
                            </h2>

                            {result.streakBonus > 0 && (
                                <p className="streak-bonus">
                                    🔥 Streak Bonus: +{result.streakBonus}
                                </p>
                            )}

                            {/* Multiplayer Round Leaderboard */}
                            {roundLeaderboard && (
                                <div style={{ width: '100%', maxWidth: '600px', marginBottom: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '15px' }}>
                                    <h3 style={{ fontSize: '1.2rem', color: 'var(--accent-yellow)', marginBottom: '10px', textAlign: 'center' }}>🏆 Bảng Xếp Hạng Vòng Này</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {roundLeaderboard.map((p, idx) => (
                                            <div key={idx} style={{
                                                display: 'flex', justifyContent: 'space-between',
                                                padding: '8px 15px',
                                                background: p.username === user.username ? 'rgba(0, 212, 255, 0.2)' : 'rgba(255,255,255,0.05)',
                                                borderRadius: '8px',
                                                border: p.username === user.username ? '1px solid var(--accent-cyan)' : 'none'
                                            }}>
                                                <span style={{ fontWeight: 'bold' }}>#{idx + 1} {p.username}</span>
                                                <span style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>{p.score} pts</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Explanation Section */}
                            {question && question.explanation && (
                                <div className="explanation-box">
                                    <h4 className="explanation-title">
                                        💡 Explanation
                                    </h4>
                                    <p className="explanation-text">
                                        <RenderWithMath text={question.explanation} />
                                    </p>
                                </div>
                            )}

                            {(!isMultiplayer || (isMultiplayer && isHost)) ? (
                                <button
                                    className="next-btn"
                                    onClick={handleNextQuestion}
                                >
                                    Next Question ➡️
                                </button>
                            ) : (
                                <div className="waiting-host">
                                    <div className="loading-spinner" style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'var(--accent-cyan)' }}></div>
                                    Waiting for host...
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* REVIEW BOARD OVERLAY */}
            {showReviewBoard && (
                <div className="review-board-overlay" style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.95)', zIndex: 2000,
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    padding: '20px', overflowY: 'auto'
                }}>
                    <h1 style={{ color: 'white', marginBottom: '20px', textShadow: '0 0 10px #00d4ff' }}>📝 Tổng Kết & Ôn Tập</h1>

                    <div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '100px' }}>
                        {sessionHistory.map((item, idx) => (
                            <div key={idx} className="glass-card" style={{ padding: '20px', borderLeft: item.isCorrect ? '5px solid #00ff88' : '5px solid #ff416c' }}>
                                <h3 style={{ marginBottom: '15px', fontSize: '1.1rem' }}>
                                    <span style={{ opacity: 0.7 }}>Câu {idx + 1}:</span> <RenderWithMath text={item.question.question} />
                                </h3>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                                    <div style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                        <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>Bạn chọn:</div>
                                        <div style={{ color: item.isCorrect ? '#00ff88' : '#ff416c', fontWeight: 'bold' }}>
                                            <RenderWithMath text={item.userAnswer} />
                                        </div>
                                    </div>
                                    {!item.isCorrect && (
                                        <div style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                            <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>Đáp án đúng:</div>
                                            <div style={{ color: '#00ff88', fontWeight: 'bold' }}>
                                                <RenderWithMath text={item.correctAnswer} />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {item.explanation && (
                                    <div style={{ background: 'rgba(255, 215, 0, 0.1)', padding: '15px', borderRadius: '8px', border: '1px dashed rgba(255, 215, 0, 0.3)' }}>
                                        <strong style={{ color: '#ffd700', display: 'block', marginBottom: '5px' }}>💡 Giải thích:</strong>
                                        <span style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>
                                            <RenderWithMath text={item.explanation} />
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div style={{
                        position: 'fixed', bottom: 0, left: 0, width: '100%',
                        padding: '20px', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
                        display: 'flex', justifyContent: 'center', gap: '20px'
                    }}>
                        <button
                            className="btn-secondary"
                            style={{ padding: '12px 30px', fontSize: '1.1rem' }}
                            onClick={() => setShowReviewBoard(false)}
                        >
                            🔙 Tiếp tục chơi
                        </button>
                        <button
                            className="btn-primary"
                            style={{ padding: '12px 30px', fontSize: '1.1rem' }}
                            onClick={async () => {
                                await refreshUserData();
                                navigate('/');
                            }}
                        >
                            🏠 Về Trang Chủ
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuizGame;

