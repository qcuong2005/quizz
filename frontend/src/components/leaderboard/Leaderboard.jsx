import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, ArrowLeft, Crown, Medal } from 'lucide-react';
import '../../styles/GlobalStyles.css';
import Header from '../layout/Header';

const Leaderboard = () => {
    const navigate = useNavigate();
    const [rankings, setRankings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('score'); // 'score', 'streak', 'games'

    useEffect(() => {
        setLoading(true);
        fetch(`http://localhost:8080/api/rankings?type=${activeTab}`)
            .then(res => res.json())
            .then(data => {
                setRankings(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching rankings:", err);
                setLoading(false);
            });
    }, [activeTab]);

    const top1 = rankings.length > 0 ? rankings[0] : null;
    const top2 = rankings.length > 1 ? rankings[1] : null;
    const top3 = rankings.length > 2 ? rankings[2] : null;
    const rest = rankings.slice(3);

    const getDisplayValue = (user) => {
        if (activeTab === 'streak') return `${user.streak} 🔥`;
        if (activeTab === 'games') return `${user.gamesPlayed} 📚`;
        return `${user.totalScore.toLocaleString()} pts`;
    };

    return (
        <div className="page-wrapper theme-winter">
            <div className="animated-bg">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
            </div>

            <Header />

            <main className="leaderboard-page" style={{ paddingTop: '100px', maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px' }}>

                {/* Header Section */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', marginBottom: '80px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button onClick={() => navigate('/')} className="btn-icon" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <ArrowLeft size={24} />
                        </button>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, background: 'linear-gradient(to right, #ffd700, #ffecb3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
                            Bảng Xếp Hạng
                        </h1>
                    </div>

                    {/* TABS */}
                    <div className="tabs" style={{ display: 'flex', gap: '10px', background: 'rgba(0,0,0,0.3)', padding: '5px', borderRadius: '30px' }}>
                        {[
                            { id: 'score', label: 'Điểm Số', icon: '🏆' },
                            { id: 'streak', label: 'Chuỗi Thắng', icon: '🔥' },
                            { id: 'games', label: 'Chăm Chỉ', icon: '📚' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '25px',
                                    border: 'none',
                                    background: activeTab === tab.id ? 'linear-gradient(to right, #6a11cb, #2575fc)' : 'transparent',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    boxShadow: activeTab === tab.id ? '0 4px 15px rgba(37, 117, 252, 0.4)' : 'none'
                                }}
                            >
                                <span style={{ marginRight: '5px' }}>{tab.icon}</span> {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', color: 'white', marginTop: '50px' }}>Đang tải...</div>
                ) : (
                    <>
                        {/* PODIUM SECTION */}
                        <div className="podium-section" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '20px', marginBottom: '60px', height: '350px' }}>

                            {/* TOP 2 */}
                            {top2 && (
                                <div className="podium-item" style={{ textAlign: 'center', animation: 'slideUp 0.6s 0.2s backwards' }}>
                                    <div style={{ position: 'relative', marginBottom: '10px' }}>
                                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#C0C0C0', border: '4px solid #fff', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>
                                            {top2.avatar}
                                        </div>
                                        <div style={{ position: 'absolute', bottom: '-10px', left: '50%', transform: 'translateX(-50%)', background: '#C0C0C0', color: '#000', padding: '2px 8px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                            #2
                                        </div>
                                    </div>
                                    <h3 style={{ margin: '10px 0 5px', fontSize: '1.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                                        {top2.fullName || top2.username}
                                    </h3>
                                    <p style={{ color: '#C0C0C0', fontWeight: 'bold' }}>{getDisplayValue(top2)}</p>
                                    <div style={{ width: '100px', height: '140px', background: 'linear-gradient(to top, rgba(192,192,192,0.3), rgba(192,192,192,0.1))', borderTopLeftRadius: '10px', borderTopRightRadius: '10px', margin: '10px auto 0', border: '1px solid rgba(192,192,192,0.3)', borderBottom: 'none' }}></div>
                                </div>
                            )}

                            {/* TOP 1 */}
                            {top1 && (
                                <div className="podium-item" style={{ textAlign: 'center', animation: 'slideUp 0.6s backwards', zIndex: 10 }}>
                                    <div style={{ position: 'relative', marginBottom: '10px' }}>
                                        <Crown size={40} color="#FFD700" style={{ position: 'absolute', top: -45, left: '50%', transform: 'translateX(-50%)', animation: 'bounce 2s infinite' }} fill="#FFD700" />
                                        <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#FFD700', border: '4px solid #fff', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold', boxShadow: '0 0 30px rgba(255, 215, 0, 0.6)' }}>
                                            {top1.avatar}
                                        </div>
                                        <div style={{ position: 'absolute', bottom: '-10px', left: '50%', transform: 'translateX(-50%)', background: '#FFD700', color: '#000', padding: '2px 12px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                            #1
                                        </div>
                                    </div>
                                    <h3 style={{ margin: '12px 0 5px', fontSize: '1.5rem', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }}>
                                        {top1.fullName || top1.username}
                                    </h3>
                                    <p style={{ color: '#FFD700', fontWeight: 'bold', fontSize: '1.2rem' }}>{getDisplayValue(top1)}</p>
                                    <div style={{ width: '120px', height: '180px', background: 'linear-gradient(to top, rgba(255, 215, 0, 0.4), rgba(255, 215, 0, 0.1))', borderTopLeftRadius: '10px', borderTopRightRadius: '10px', margin: '10px auto 0', border: '1px solid rgba(255, 215, 0, 0.4)', borderBottom: 'none', boxShadow: '0 0 20px rgba(255, 215, 0, 0.2)' }}></div>
                                </div>
                            )}

                            {/* TOP 3 */}
                            {top3 && (
                                <div className="podium-item" style={{ textAlign: 'center', animation: 'slideUp 0.6s 0.4s backwards' }}>
                                    <div style={{ position: 'relative', marginBottom: '10px' }}>
                                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#CD7F32', border: '4px solid #fff', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>
                                            {top3.avatar}
                                        </div>
                                        <div style={{ position: 'absolute', bottom: '-10px', left: '50%', transform: 'translateX(-50%)', background: '#CD7F32', color: '#000', padding: '2px 8px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                            #3
                                        </div>
                                    </div>
                                    <h3 style={{ margin: '10px 0 5px', fontSize: '1.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                                        {top3.fullName || top3.username}
                                    </h3>
                                    <p style={{ color: '#CD7F32', fontWeight: 'bold' }}>{getDisplayValue(top3)}</p>
                                    <div style={{ width: '100px', height: '100px', background: 'linear-gradient(to top, rgba(205, 127, 50, 0.3), rgba(205, 127, 50, 0.1))', borderTopLeftRadius: '10px', borderTopRightRadius: '10px', margin: '10px auto 0', border: '1px solid rgba(205, 127, 50, 0.3)', borderBottom: 'none' }}></div>
                                </div>
                            )}
                        </div>

                        {/* LIST SECTION */}
                        <div className="ranking-list" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '20px', padding: '20px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', maxWidth: '800px', margin: '0 auto' }}>
                            {rest.map((user, index) => (
                                <div key={user.username} style={{ display: 'flex', alignItems: 'center', padding: '15px', borderBottom: '1px solid rgba(255,255,255,0.05)', animation: 'fadeIn 0.5s ease', animationDelay: `${index * 0.05}s` }}>
                                    <div style={{ width: '40px', fontSize: '1.1rem', color: '#aaa', fontWeight: '600' }}>#{index + 4}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                            {user.avatar}
                                        </div>
                                        <span style={{ fontSize: '1.1rem', fontWeight: '500' }}>{user.fullName || user.username}</span>
                                    </div>
                                    <div style={{ fontWeight: '700', color: 'var(--accent-cyan)' }}>{getDisplayValue(user)}</div>
                                </div>
                            ))}
                            {rest.length === 0 && <div style={{ textAlign: 'center', color: '#888', padding: '20px' }}>Chưa có thêm người chơi nào khác.</div>}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

export default Leaderboard;
