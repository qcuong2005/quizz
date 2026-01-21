import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCategories, getPosts } from '../../services/forumService';
import Header from '../layout/Header';
import RenderWithMath from '../common/RenderWithMath';
import { MessageSquare, Heart, Clock, Search, PlusCircle } from 'lucide-react';
import './ForumHome.css';

const ForumHome = () => {
    const [categories, setCategories] = useState([]);
    const [posts, setPosts] = useState([]);
    const [activeCategory, setActiveCategory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchData();
    }, [activeCategory]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [catsRes, postsRes] = await Promise.all([
                getCategories(),
                getPosts({ categoryId: activeCategory })
            ]);
            setCategories(catsRes);
            setPosts(postsRes.content);
        } catch (error) {
            console.error('Failed to load forum data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await getPosts({ search });
            setPosts(res.content);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-wrapper">
            {/* Background Effects */}
            <div className="animated-bg">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
                <div className="orb orb-3"></div>
            </div>

            <Header />

            <div className="container" style={{ paddingTop: '100px', paddingBottom: '50px' }}>
                <div className="flex-between" style={{ marginBottom: '30px' }}>
                    <div>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '10px' }}>
                            Diễn Đàn Thảo Luận 💬
                        </h1>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            Chia sẻ kiến thức, hỏi đáp và kết nối với cộng đồng.
                        </p>
                    </div>
                    <Link to="/forum/new" className="btn btn-primary">
                        <PlusCircle size={20} /> Viết bài mới
                    </Link>
                </div>

                {/* Categories & Search */}
                <div className="forum-controls glass-card" style={{ padding: '20px', marginBottom: '30px' }}>
                    <div className="flex-between" style={{ flexWrap: 'wrap', gap: '20px' }}>
                        {/* Categories */}
                        <div className="category-list" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <button
                                className={`btn ${!activeCategory ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setActiveCategory(null)}
                            >
                                Tất cả
                            </button>
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    className={`btn ${activeCategory === cat.id ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => setActiveCategory(cat.id)}
                                >
                                    {cat.icon} {cat.name}
                                </button>
                            ))}
                        </div>

                        {/* Search */}
                        <form onSubmit={handleSearch} style={{ position: 'relative', width: '300px' }}>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Tìm kiếm bài viết..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{ paddingRight: '40px' }}
                            />
                            <button
                                type="submit"
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    color: 'var(--text-secondary)'
                                }}
                            >
                                <Search size={20} />
                            </button>
                        </form>
                    </div>
                </div>

                {/* Posts List */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '50px' }}>
                        <div className="loading-spinner"></div>
                    </div>
                ) : (
                    <div className="posts-grid" style={{ display: 'grid', gap: '20px' }}>
                        {posts.length === 0 ? (
                            <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                Chưa có bài viết nào. Hãy là người đầu tiên chia sẻ! ✍️
                            </div>
                        ) : (
                            posts.map(post => (
                                <Link to={`/forum/post/${post.id}`} key={post.id} className="glass-card post-card">
                                    <div style={{ padding: '20px' }}>
                                        <div className="flex-between" style={{ marginBottom: '15px' }}>
                                            <span className="post-category badge-category">
                                                {post.category?.icon} {post.category?.name}
                                            </span>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <Clock size={14} /> {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                                            </span>
                                        </div>

                                        <h3 className="post-title" style={{ fontSize: '1.4rem', marginBottom: '10px', color: 'var(--text-primary)' }}>
                                            <RenderWithMath text={post.title} />
                                        </h3>

                                        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            <RenderWithMath text={post.content} />
                                        </p>

                                        <div className="flex-between" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '15px', marginTop: '15px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div className="user-avatar-small" style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                                    {post.author?.username.charAt(0).toUpperCase()}
                                                </div>
                                                <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>{post.author?.fullName || post.author?.username}</span>
                                            </div>

                                            <div style={{ display: 'flex', gap: '15px', color: 'var(--text-secondary)' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <Heart size={16} /> {post.likeCount}
                                                </span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <MessageSquare size={16} /> {post.commentCount}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ForumHome;
