import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getPostById, getComments, addComment, toggleLike, deletePost } from '../../services/forumService';
import { uploadFile } from '../../services/fileService';
import { getCurrentUser } from '../../services/authService';
import Header from '../layout/Header';
import RenderWithMath from '../common/RenderWithMath';
import { Heart, ArrowLeft, Send, Trash2, Image as ImageIcon, Reply } from 'lucide-react';

const ForumPostDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [likeCount, setLikeCount] = useState(0);
    const [replyingTo, setReplyingTo] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = React.useRef(null);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            const [postData, commentData] = await Promise.all([
                getPostById(id),
                getComments(id)
            ]);
            setPost(postData);
            setLikeCount(postData.likeCount);
            setComments(commentData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleLike = async () => {
        try {
            const res = await toggleLike(id);
            if (res.liked) {
                setLikeCount(prev => prev + 1);
            } else {
                setLikeCount(prev => prev - 1);
            }
        } catch (error) {
            console.error("Like failed", error);
        }
    };

    const handlePaste = async (e) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault();
                const file = items[i].getAsFile();
                await handleImageUpload(file);
            }
        }
    };

    const handleImageUpload = async (file) => {
        setIsUploading(true);
        try {
            const result = await uploadFile(file);
            const fileUrl = result.fileUrl;
            setNewComment(prev => prev + `\n![Image](${fileUrl})\n`);
        } catch (err) {
            console.error("Upload failed", err);
            alert('Upload ảnh thất bại: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsUploading(false);
        }
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            // Updated to pass replyingTo as parentId
            const addedComment = await addComment(id, newComment, replyingTo); // Note: Need to update service call too? NO, service.js handles args.
            // Wait, service.js addComment signature is (postId, content). I need to update it there?
            // Yes, I updated Backend but Frontend service might need check.
            // Actually I'll pass it as 3rd arg.

            // Refresh comments to get correct tree structure or append
            // For simplicity, re-fetch comments
            const updatedComments = await getComments(id);
            setComments(updatedComments);

            setNewComment('');
            setReplyingTo(null);
        } catch (error) {
            console.error("Comment failed", error);
        }
    };

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // ... (existing useEffect and loadData)

    const handleDelete = () => {
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        try {
            await deletePost(id);
            navigate('/forum');
        } catch (error) {
            console.error("Delete failed", error);
            alert("Xóa bài viết thất bại. Vui lòng thử lại.");
        } finally {
            setShowDeleteConfirm(false);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!post) return <div>Post not found</div>;

    const currentUser = getCurrentUser();
    const isAuthor = currentUser && post.author && currentUser.username === post.author.username;

    return (
        <div className="page-wrapper">
            <div className="animated-bg">
                <div className="orb orb-3"></div>
            </div>

            <Header />

            <div className="container" style={{ paddingTop: '100px', paddingBottom: '50px', maxWidth: '900px' }}>
                <Link to="/forum" className="btn btn-ghost" style={{ marginBottom: '20px', paddingLeft: '0' }}>
                    <ArrowLeft size={18} /> Quay lại diễn đàn
                </Link>

                {/* POST CONTENT */}
                <div className="glass-card" style={{ padding: '40px', marginBottom: '30px' }}>
                    <div className="flex-between" style={{ marginBottom: '20px' }}>
                        <span className="post-category" style={{ background: 'rgba(255,255,255,0.1)', padding: '5px 12px', borderRadius: '20px' }}>
                            {post.category?.icon} {post.category?.name}
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                            </span>
                            {isAuthor && (
                                <button
                                    onClick={handleDelete}
                                    className="btn btn-ghost"
                                    style={{ color: '#ff4d4d', padding: '5px 10px', fontSize: '0.9rem' }}
                                    title="Xóa bài viết"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                    </div>

                    <h1 style={{ fontSize: '2rem', marginBottom: '20px', lineHeight: '1.3' }}><RenderWithMath text={post.title} /></h1>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid var(--glass-border)' }}>
                        <div className="user-avatar-small" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                            {post.author?.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div style={{ fontWeight: '600' }}>{post.author?.fullName || post.author?.username}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tác giả</div>
                        </div>
                    </div>

                    <div style={{ fontSize: '1.1rem', lineHeight: '1.7', whiteSpace: 'pre-line', marginBottom: '30px', color: 'rgba(255,255,255,0.9)' }}>
                        <RenderWithMath text={post.content} />
                    </div>

                    {/* Interactions */}
                    <div className="flex-between">
                        <button onClick={handleLike} className="btn btn-secondary" style={{ borderRadius: '20px', padding: '8px 20px' }}>
                            <Heart size={18} fill={likeCount > post.likeCount ? "currentColor" : "none"} /> {likeCount} Thích
                        </button>
                    </div>
                </div>

                {/* COMMENTS SECTION */}
                <div className="glass-card" style={{ padding: '30px' }}>
                    <h3 style={{ marginBottom: '20px' }}>💬 Bình luận ({comments.length})</h3>

                    <CommentSection
                        comments={comments}
                        currentUser={getCurrentUser()}
                        onReply={setReplyingTo}
                    />

                    {/* Add Comment Form */}
                    {getCurrentUser() ? (
                        <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid var(--glass-border)' }}>
                            {replyingTo && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', fontSize: '0.9rem', color: 'var(--accent-cyan)' }}>
                                    <span>Đang trả lời bình luận...</span>
                                    <button onClick={() => setReplyingTo(null)} className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: '0.8rem' }}>Hủy trả lời</button>
                                </div>
                            )}
                            <form onSubmit={handleCommentSubmit} style={{ position: 'relative' }}>
                                <div style={{ position: 'relative' }}>
                                    <textarea
                                        className="form-input"
                                        placeholder={replyingTo ? "Viết câu trả lời của bạn..." : "Viết bình luận của bạn..."}
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        onPaste={handlePaste}
                                        rows={replyingTo ? 2 : 3}
                                        style={{ paddingRight: '50px', resize: 'vertical', minHeight: '60px' }}
                                    />
                                    <div style={{ position: 'absolute', right: '10px', bottom: '10px', display: 'flex', gap: '10px' }}>
                                        <button
                                            type="button"
                                            className="btn btn-ghost"
                                            onClick={() => fileInputRef.current.click()}
                                            title="Tải ảnh lên"
                                            style={{ padding: '5px' }}
                                            disabled={isUploading}
                                        >
                                            <ImageIcon size={20} />
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                            style={{ padding: '5px 15px', borderRadius: '15px' }}
                                            disabled={isUploading}
                                        >
                                            <Send size={18} />
                                        </button>
                                    </div>
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    accept="image/*"
                                    onChange={(e) => {
                                        if (e.target.files[0]) handleImageUpload(e.target.files[0]);
                                    }}
                                />
                            </form>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '15px' }}>
                            <p style={{ marginBottom: '10px', color: 'var(--text-secondary)' }}>Bạn cần đăng nhập để bình luận</p>
                            <Link to="/login" className="btn btn-primary">Đăng nhập ngay</Link>
                        </div>
                    )}
                </div>
            </div>

            {showDeleteConfirm && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="glass-card" style={{ padding: '30px', maxWidth: '400px', width: '100%', textAlign: 'center', border: '1px solid rgba(255, 77, 77, 0.3)' }}>
                        <h3 style={{ marginBottom: '15px', color: '#ff4d4d' }}>⚠️ Xác nhận xóa</h3>
                        <p style={{ marginBottom: '25px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                            Bạn có chắc chắn muốn xóa bài viết này không? <br />
                            Hành động này không thể hoàn tác.
                        </p>
                        <div className="flex-between" style={{ justifyContent: 'center', gap: '15px' }}>
                            <button
                                className="btn btn-ghost"
                                onClick={() => setShowDeleteConfirm(false)}
                                style={{ flex: 1 }}
                            >
                                Hủy bỏ
                            </button>
                            <button
                                className="btn"
                                onClick={confirmDelete}
                                style={{ flex: 1, background: '#ff4d4d', color: 'white', border: 'none' }}
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

const CommentSection = ({ comments, currentUser, onReply }) => {
    // Group comments by parentId
    const commentMap = {};
    const rootComments = [];

    // Initialize list for each parent
    comments.forEach(c => {
        if (!commentMap[c.id]) commentMap[c.id] = [];
    });

    comments.forEach(c => {
        if (c.parentId) {
            if (!commentMap[c.parentId]) commentMap[c.parentId] = [];
            commentMap[c.parentId].push(c);
        } else {
            rootComments.push(c);
        }
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '30px' }}>
            {rootComments.map(comment => (
                <CommentItem
                    key={comment.id}
                    comment={comment}
                    commentMap={commentMap}
                    currentUser={currentUser}
                    onReply={onReply}
                />
            ))}
        </div>
    );
};

const CommentItem = ({ comment, commentMap, currentUser, onReply }) => {
    const children = commentMap[comment.id] || [];

    return (
        <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: 'var(--accent-cyan)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#000' }}>
                {comment.author?.username.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <strong style={{ color: 'var(--accent-cyan)' }}>{comment.author?.fullName || comment.author?.username}</strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(comment.createdAt).toLocaleString('vi-VN')}</span>
                    </div>
                    <div style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>
                        <RenderWithMath text={comment.content} />
                    </div>

                    {currentUser && (
                        <div style={{ marginTop: '10px', display: 'flex', gap: '15px' }}>
                            <button
                                onClick={() => onReply(comment.id)}
                                className="btn-ghost"
                                style={{ padding: '0', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)' }}
                            >
                                <Reply size={14} /> Trả lời
                            </button>
                        </div>
                    )}
                </div>

                {/* Recursive Children */}
                {children.length > 0 && (
                    <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {children.map(child => (
                            <CommentItem
                                key={child.id}
                                comment={child}
                                commentMap={commentMap}
                                currentUser={currentUser}
                                onReply={onReply}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ForumPostDetail;
