import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getCurrentUser } from '../../services/authService';
import '../../styles/GlobalStyles.css';

const QuizGame = () => {
    const [searchParams] = useSearchParams();
    const topic = searchParams.get('topic');
    const navigate = useNavigate();
    const user = getCurrentUser();

    const [question, setQuestion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [result, setResult] = useState(null);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(15);

    // WebSocket Client Ref
    const stompClientRef = useRef(null);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        // WebSocket Connection
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
                stompClient.subscribe('/topic/quiz', (message) => {
                    try {
                        const receivedQuestion = JSON.parse(message.body);
                        if (receivedQuestion.error) {
                            setLoading(false);
                            alert("AI Error: " + receivedQuestion.error);
                            return;
                        }
                        if (!receivedQuestion.options || !Array.isArray(receivedQuestion.options)) {
                            setLoading(false);
                            alert("Lỗi: Dữ liệu câu hỏi không hợp lệ.");
                            return;
                        }
                        setQuestion(receivedQuestion);
                        setLoading(false);
                        setTimeLeft(15);
                        setResult(null);
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
                            setScore(prev => prev + 10);
                        }
                    }
                });

                requestQuestion(stompClient, topic);
            },
            onStompError: (frame) => {
                if (frame.headers['message'].includes("chưa đăng nhập")) {
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
    }, [topic, navigate]);

    // Timer Logic
    useEffect(() => {
        if (loading || result) return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleTimeOut();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [loading, result]);

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
        if (powerUps.fiftyFifty <= 0 || used5050 || !question || result) return;
        const wrongOptions = question.options.filter(opt => opt !== question.correctAnswer);
        const shuffled = wrongOptions.sort(() => 0.5 - Math.random());
        const toHide = shuffled.slice(0, 2);
        setHiddenOptions(toHide);
        setUsed5050(true);
        setPowerUps(prev => ({ ...prev, fiftyFifty: prev.fiftyFifty - 1 }));
    };

    const handleDoubleScore = () => {
        if (powerUps.doubleScore <= 0 || isDoubleScoreActive || result) return;
        setIsDoubleScoreActive(true);
        setPowerUps(prev => ({ ...prev, doubleScore: prev.doubleScore - 1 }));
    };

    const handleExtraTime = () => {
        if (powerUps.extraTime <= 0 || result) return;
        setTimeLeft(prev => prev + 5);
        setPowerUps(prev => ({ ...prev, extraTime: prev.extraTime - 1 }));
    };

    const handleSecondChance = () => {
        if (powerUps.secondChance <= 0 || isSecondChanceActive || result) return;
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

        if (client && client.active) {
            client.publish({
                destination: '/app/get-question',
                body: topicName
            });
        }
    };

    const handleAnswer = (selectedAns) => {
        if (!question || result) return;

        const isCorrect = selectedAns === question.correctAnswer;
        if (!isCorrect && isSecondChanceActive && !hasRetried) {
            alert("🛡️ Second Chance! Bạn được chọn lại một lần nữa.");
            setHasRetried(true);
            return;
        }

        const payload = {
            userAnswer: selectedAns,
            correctAnswer: question.correctAnswer,
            timeLeft: timeLeft,
            useDoubleScore: isDoubleScoreActive,
            isRetry: hasRetried
        };

        if (stompClientRef.current) {
            stompClientRef.current.publish({
                destination: '/app/check-answer',
                body: JSON.stringify(payload)
            });
        }
    };

    const handleNextQuestion = () => {
        requestQuestion(stompClientRef.current, topic);
    };

    const handleTimeOut = () => {
        setResult({ message: "⏰ Hết giờ!", score: 0 });
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

            <div className="quiz-page" style={{ position: 'relative', zIndex: 1 }}>
                <div className="quiz-game-container">
                    {/* Header: Stats & Timer */}
                    <div className="quiz-game-header glass-card">
                        <div className="score-badge">
                            <span className="icon">🏆</span>
                            <span>{score}</span>
                            {result && result.streak > 1 && (
                                <span className="streak-badge">🔥 {result.streak}</span>
                            )}
                        </div>

                        <div className="timer-container">
                            <div className="timer-bar">
                                <div
                                    className={`timer-fill ${getTimerClass()}`}
                                    style={{ width: `${(timeLeft / 15) * 100}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="time-display">
                            <span>⏱️</span>
                            <span>{timeLeft}s</span>
                        </div>
                    </div>

                    {/* Main Game Area */}
                    {loading ? (
                        <div className="question-card glass-card">
                            <div className="loading-state">
                                <div className="loading-spinner"></div>
                                <p>Đang tải câu hỏi... 🚀</p>
                            </div>
                        </div>
                    ) : question ? (
                        <>
                            <div className="question-card glass-card">
                                {question.question}
                            </div>

                            <div className="answers-grid">
                                {question.options.map((opt, idx) => {
                                    if (hiddenOptions.includes(opt)) {
                                        return <button key={idx} className="answer-btn hidden" disabled></button>;
                                    }

                                    let specialClass = '';
                                    if (result) {
                                        if (opt === question.correctAnswer) specialClass = 'correct';
                                        else if (opt === result.userAnswer) specialClass = 'wrong';
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            className={`answer-btn ${specialClass}`}
                                            onClick={() => handleAnswer(opt)}
                                            disabled={!!result}
                                        >
                                            {opt}
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="question-card glass-card" style={{ color: '#ff6b8a' }}>
                            ⚠️ Lỗi kết nối! Vui lòng thử lại.
                        </div>
                    )}

                    {/* Power-ups Dock */}
                    <div className="powerups-dock">
                        <button
                            className={`powerup-btn ${used5050 ? '' : ''}`}
                            onClick={handle5050}
                            disabled={used5050 || result || powerUps.fiftyFifty === 0}
                        >
                            <span>⚖️</span>
                            <span className="powerup-count">{powerUps.fiftyFifty}</span>
                        </button>
                        <button
                            className={`powerup-btn ${isDoubleScoreActive ? 'active' : ''}`}
                            onClick={handleDoubleScore}
                            disabled={isDoubleScoreActive || result || powerUps.doubleScore === 0}
                        >
                            <span>✖️2</span>
                            <span className="powerup-count">{powerUps.doubleScore}</span>
                        </button>
                        <button
                            className="powerup-btn"
                            onClick={handleExtraTime}
                            disabled={result || powerUps.extraTime === 0}
                        >
                            <span>⏳</span>
                            <span className="powerup-count">{powerUps.extraTime}</span>
                        </button>
                        <button
                            className={`powerup-btn ${isSecondChanceActive ? 'active' : ''}`}
                            onClick={handleSecondChance}
                            disabled={isSecondChanceActive || result || powerUps.secondChance === 0}
                        >
                            <span>🛡️</span>
                            <span className="powerup-count">{powerUps.secondChance}</span>
                        </button>
                    </div>

                    {/* Result Section */}
                    {result && (
                        <div className="result-section">
                            <h2 className={`result-message ${result.score > 0 ? 'correct' : 'wrong'}`}>
                                {result.message}
                            </h2>
                            {result.streakBonus > 0 && (
                                <p className="streak-bonus">🔥 Bonus streak: +{result.streakBonus}</p>
                            )}

                            {/* Explanation Section */}
                            {question && question.explanation && (
                                <div style={{
                                    marginTop: '20px',
                                    padding: '20px',
                                    background: 'rgba(0, 212, 255, 0.1)',
                                    border: '1px solid rgba(0, 212, 255, 0.3)',
                                    borderRadius: '12px',
                                    textAlign: 'left'
                                }}>
                                    <h4 style={{
                                        color: 'var(--accent-cyan)',
                                        marginBottom: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        💡 Giải thích
                                    </h4>
                                    <p style={{
                                        color: 'var(--text-secondary)',
                                        lineHeight: '1.6',
                                        fontSize: '0.95rem'
                                    }}>
                                        {question.explanation}
                                    </p>
                                </div>
                            )}

                            <button className="btn btn-primary next-btn" onClick={handleNextQuestion} style={{ marginTop: '20px' }}>
                                Câu tiếp theo ➡️
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QuizGame;
