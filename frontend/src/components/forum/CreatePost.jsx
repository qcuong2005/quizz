import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getCategories, createPost } from '../../services/forumService';
import { uploadFile } from '../../services/fileService';
import Header from '../layout/Header';

const CreatePost = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [categories, setCategories] = useState([]);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        categoryId: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        loadCategories();
        // Check for shared data
        if (location.state) {
            const { initialTitle, initialContent } = location.state;
            if (initialTitle || initialContent) {
                setFormData(prev => ({
                    ...prev,
                    title: initialTitle || '',
                    content: initialContent || ''
                }));
            }
        }
    }, [location.state]);

    const loadCategories = async () => {
        try {
            const data = await getCategories();
            setCategories(data);
            if (data.length > 0) {
                setFormData(prev => ({ ...prev, categoryId: data[0].id }));
            }
        } catch (err) {
            console.error("Failed to load categories", err);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
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
        try {
            const result = await uploadFile(file);
            const fileUrl = result.fileUrl;

            setFormData(prev => ({
                ...prev,
                content: prev.content + `\n![Image](${fileUrl})\n`
            }));
        } catch (err) {
            console.error("Upload failed", err);
            setError('Upload ảnh thất bại: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        if (!formData.title || !formData.content) {
            setError('Vui lòng nhập tiêu đề và nội dung!');
            setIsLoading(false);
            return;
        }

        try {
            await createPost(formData);
            navigate('/forum');
        } catch (err) {
            setError('Có lỗi xảy ra, vui lòng thử lại.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        // ... (wrapper and header)

        <div className="container" style={{ paddingTop: '100px', maxWidth: '800px' }}>
            <div className="glass-card" style={{ padding: '40px' }}>
                <h2 style={{ marginBottom: '30px', fontSize: '1.8rem', textAlign: 'center' }}>📝 Tạo bài viết mới</h2>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Tiêu đề bài viết</label>
                        <input
                            type="text"
                            name="title"
                            className="form-input"
                            placeholder="Tiêu đề bài viết..."
                            value={formData.title}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Chuyên mục</label>
                        <select
                            name="categoryId"
                            className="form-input"
                            value={formData.categoryId}
                            onChange={handleChange}
                            required
                        >
                            {categories.map(category => (
                                <option key={category.id} value={category.id}>
                                    {category.icon} {category.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <div className="flex-between" style={{ marginBottom: '5px' }}>
                            <label className="form-label">Nội dung</label>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                (Bạn có thể dán ảnh trực tiếp vào đây)
                            </span>
                        </div>
                        <textarea
                            name="content"
                            className="form-input"
                            placeholder="Bạn đang nghĩ gì?..."
                            value={formData.content}
                            onChange={handleChange}
                            onPaste={handlePaste}
                            rows="10"
                            required
                        ></textarea>
                    </div>



                    <div className="flex-between" style={{ marginTop: '30px' }}>
                        <button type="button" onClick={() => navigate('/forum')} className="btn btn-ghost">Hủy bỏ</button>
                        <button type="submit" className="btn btn-primary" disabled={isLoading}>
                            {isLoading ? 'Đang đăng...' : 'Đăng bài'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreatePost;
