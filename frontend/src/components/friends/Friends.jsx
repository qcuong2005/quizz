import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../../services/authService';
import {
    getFriends,
    getPendingRequests,
    searchUsers,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend
} from '../../services/friendService';
import Header from '../layout/Header';
import { Users, UserPlus, Mail, Search, Trophy, Flame, Target, X, Check, UserMinus } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './Friends.css';

const Friends = () => {
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('friends'); // 'friends', 'requests', 'add'
    const [friends, setFriends] = useState([]);
    const [requests, setRequests] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [friendToDelete, setFriendToDelete] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            navigate('/login');
            return;
        }
        setUser(currentUser);
        loadFriends();
        loadRequests();
    }, [navigate]);

    const loadFriends = async () => {
        try {
            const data = await getFriends();
            setFriends(data);
        } catch (error) {
            console.error('Error loading friends:', error);
        }
    };

    const loadRequests = async () => {
        try {
            const data = await getPendingRequests();
            setRequests(data);
        } catch (error) {
            console.error('Error loading requests:', error);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        setLoading(true);
        try {
            const results = await searchUsers(searchQuery);
            setSearchResults(results);
        } catch (error) {
            toast.error('❌ Lỗi tìm kiếm: ' + error.message, {
                theme: 'dark',
                icon: '🔍'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSendRequest = async (friendId) => {
        try {
            const result = await sendFriendRequest(friendId);
            toast.success('🎉 ' + (result.message || 'Đã gửi lời mời kết bạn thành công!'), {
                theme: 'dark',
                icon: '✨'
            });
            handleSearch(); // Refresh search results
        } catch (error) {
            toast.error('❌ ' + error.message, {
                theme: 'dark'
            });
        }
    };

    const handleAcceptRequest = async (requestId) => {
        try {
            const result = await acceptFriendRequest(requestId);
            toast.success('🤝 ' + (result.message || 'Đã chấp nhận lời mời kết bạn!'), {
                theme: 'dark',
                icon: '🎊'
            });
            loadRequests();
            loadFriends();
        } catch (error) {
            toast.error('❌ ' + error.message, {
                theme: 'dark'
            });
        }
    };

    const handleRejectRequest = async (requestId) => {
        try {
            const result = await rejectFriendRequest(requestId);
            toast.success('👋 ' + (result.message || 'Đã từ chối lời mời'), {
                theme: 'dark',
                icon: 'ℹ️'
            });
            loadRequests();
        } catch (error) {
            toast.error('❌ ' + error.message, {
                theme: 'dark'
            });
        }
    };

    const confirmRemoveFriend = (friendId, friendName) => {
        setFriendToDelete({ id: friendId, name: friendName });
        setShowConfirmModal(true);
    };

    const handleRemoveFriend = async () => {
        if (!friendToDelete) return;

        try {
            const result = await removeFriend(friendToDelete.id);
            toast.success('💔 ' + (result.message || 'Đã xóa bạn khỏi danh sách'), {
                theme: 'dark',
                icon: '🗑️'
            });
            loadFriends();
        } catch (error) {
            toast.error('❌ ' + error.message, {
                theme: 'dark'
            });
        } finally {
            setShowConfirmModal(false);
            setFriendToDelete(null);
        }
    };

    const renderFriendsList = () => {
        if (friends.length === 0) {
            return (
                <div className="empty-state">
                    <Users size={64} />
                    <h3>Chưa có bạn bè</h3>
                    <p>Hãy thêm bạn bè để cùng thi đấu và so sánh thành tích!</p>
                    <button className="btn btn-primary" onClick={() => setActiveTab('add')}>
                        <UserPlus size={20} /> Thêm bạn
                    </button>
                </div>
            );
        }

        return (
            <div className="friends-grid">
                {friends.map(friend => (
                    <div key={friend.id} className="friend-card">
                        <div className="friend-header">
                            <div className="friend-avatar">
                                {(friend.fullName || friend.username).charAt(0).toUpperCase()}
                                <span className={`status-dot ${friend.online ? 'online' : 'offline'}`}
                                    title={friend.online ? 'Online' : 'Offline'}>
                                </span>
                            </div>
                            <div className="friend-info">
                                <h3>{friend.fullName || friend.username}</h3>
                                <span className="friend-username">@{friend.username}</span>
                            </div>
                            <button
                                className="btn-icon btn-danger"
                                onClick={() => confirmRemoveFriend(friend.id, friend.fullName || friend.username)}
                                title="Xóa bạn"
                            >
                                <UserMinus size={18} />
                            </button>
                        </div>
                        <div className="friend-stats">
                            <div className="stat-item">
                                <Trophy size={16} />
                                <span>{friend.totalScore?.toLocaleString() || 0}</span>
                                <label>Điểm</label>
                            </div>
                            <div className="stat-item">
                                <Flame size={16} />
                                <span>{friend.streak || 0}</span>
                                <label>Streak</label>
                            </div>
                            <div className="stat-item">
                                <Target size={16} />
                                <span>#{friend.rank || '---'}</span>
                                <label>Hạng</label>
                            </div>
                        </div>
                        {user && (
                            <div className="friend-comparison">
                                <div className="comparison-bar">
                                    <div
                                        className="comparison-fill"
                                        style={{
                                            width: `${Math.min(100, (friend.totalScore / (user.totalScore || 1)) * 100)}%`
                                        }}
                                    />
                                </div>
                                <span className="comparison-text">
                                    {friend.totalScore > user.totalScore
                                        ? `Cao hơn bạn ${(friend.totalScore - user.totalScore).toLocaleString()} điểm`
                                        : friend.totalScore < user.totalScore
                                            ? `Thấp hơn bạn ${(user.totalScore - friend.totalScore).toLocaleString()} điểm`
                                            : 'Bằng điểm với bạn'}
                                </span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    const renderRequestsList = () => {
        if (requests.length === 0) {
            return (
                <div className="empty-state">
                    <Mail size={64} />
                    <h3>Không có lời mời kết bạn</h3>
                    <p>Bạn chưa có lời mời kết bạn nào đang chờ xử lý</p>
                </div>
            );
        }

        return (
            <div className="requests-list">
                {requests.map(request => (
                    <div key={request.requestId} className="request-card">
                        <div className="request-avatar">
                            {(request.senderFullName || request.senderUsername).charAt(0).toUpperCase()}
                        </div>
                        <div className="request-info">
                            <h3>{request.senderFullName || request.senderUsername}</h3>
                            <span className="request-username">@{request.senderUsername}</span>
                            <span className="request-score">
                                <Trophy size={14} /> {request.senderScore?.toLocaleString() || 0} điểm
                            </span>
                        </div>
                        <div className="request-actions">
                            <button
                                className="btn btn-success"
                                onClick={() => handleAcceptRequest(request.requestId)}
                            >
                                <Check size={18} /> Chấp nhận
                            </button>
                            <button
                                className="btn btn-ghost"
                                onClick={() => handleRejectRequest(request.requestId)}
                            >
                                <X size={18} /> Từ chối
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderAddFriend = () => {
        return (
            <div className="add-friend-section">
                <div className="search-box">
                    <div className="search-input-wrapper">
                        <Search size={20} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo tên đăng nhập..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <button className="btn btn-primary" onClick={handleSearch} disabled={loading}>
                            {loading ? 'Đang tìm...' : 'Tìm kiếm'}
                        </button>
                    </div>
                </div>

                {searchResults.length > 0 ? (
                    <div className="search-results">
                        {searchResults.map(result => (
                            <div key={result.id} className="search-result-card">
                                <div className="result-avatar">
                                    {(result.fullName || result.username).charAt(0).toUpperCase()}
                                </div>
                                <div className="result-info">
                                    <h3>{result.fullName || result.username}</h3>
                                    <span className="result-username">@{result.username}</span>
                                    <span className="result-stats">
                                        <Trophy size={14} /> {result.totalScore?.toLocaleString() || 0} • #{result.rank || '---'}
                                    </span>
                                </div>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => handleSendRequest(result.id)}
                                    disabled={result.isPending}
                                >
                                    {result.isPending ? (
                                        <>
                                            <Mail size={18} /> Đã gửi
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus size={18} /> Kết bạn
                                        </>
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                ) : searchQuery && !loading ? (
                    <div className="empty-state">
                        <Search size={64} />
                        <h3>Không tìm thấy kết quả</h3>
                        <p>Thử tìm kiếm với từ khóa khác</p>
                    </div>
                ) : null}
            </div>
        );
    };

    return (
        <div className="page-wrapper">
            <Header />
            <ToastContainer
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="dark"
                style={{ zIndex: 99999 }}
            />

            <main className="friends-page">
                <div className="friends-container">
                    <div className="friends-header">
                        <h1>
                            <Users size={32} /> Bạn bè
                        </h1>
                        <p>Kết nối và thi đấu với bạn bè của bạn</p>
                    </div>

                    <div className="friends-tabs">
                        <button
                            className={`tab ${activeTab === 'friends' ? 'active' : ''}`}
                            onClick={() => setActiveTab('friends')}
                        >
                            <Users size={20} />
                            Bạn bè ({friends.length})
                        </button>
                        <button
                            className={`tab ${activeTab === 'requests' ? 'active' : ''}`}
                            onClick={() => setActiveTab('requests')}
                        >
                            <Mail size={20} />
                            Lời mời ({requests.length})
                        </button>
                        <button
                            className={`tab ${activeTab === 'add' ? 'active' : ''}`}
                            onClick={() => setActiveTab('add')}
                        >
                            <UserPlus size={20} />
                            Thêm bạn
                        </button>
                    </div>

                    <div className="friends-content">
                        {activeTab === 'friends' && renderFriendsList()}
                        {activeTab === 'requests' && renderRequestsList()}
                        {activeTab === 'add' && renderAddFriend()}
                    </div>
                </div>
            </main>

            {/* Custom Confirmation Modal */}
            {showConfirmModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-icon warning">
                            <UserMinus size={32} />
                        </div>
                        <h3>Xóa bạn bè?</h3>
                        <p>Bạn có chắc chắn muốn xóa <strong>{friendToDelete?.name}</strong> khỏi danh sách bạn bè không?</p>
                        <div className="modal-actions">
                            <button
                                className="btn btn-ghost"
                                onClick={() => setShowConfirmModal(false)}
                            >
                                Hủy bỏ
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={handleRemoveFriend}
                            >
                                Xóa ngay
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Friends;
