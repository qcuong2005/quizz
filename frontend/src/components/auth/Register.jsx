import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../../services/authService';
import '../../styles/GlobalStyles.css';

const Register = () => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        fullName: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (formData.password !== formData.confirmPassword) {
            setError('Mật khẩu nhập lại không khớp!');
            return;
        }

        if (formData.password.length < 6) {
            setError('Mật khẩu phải có ít nhất 6 ký tự!');
            return;
        }

        setIsLoading(true);

        try {
            await register(formData.username, formData.password, formData.fullName);
            setSuccess('🎉 Đăng ký thành công! Đang chuyển hướng...');
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="page-wrapper">
            {/* Animated Background */}
            <div className="animated-bg">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
                <div className="orb orb-3"></div>
            </div>

            {/* Auth Content */}
            <div className="auth-page">
                <div className="auth-card glass-card">
                    {/* Header */}
                    <div className="auth-header">
                        <span className="auth-icon">✨</span>
                        <h1 className="auth-title">Tạo Tài Khoản</h1>
                        <p className="auth-subtitle">Tham gia cùng hàng ngàn người chơi khác! 🎮</p>
                    </div>

                    {/* Messages */}
                    {error && <div className="error-message">⚠️ {error}</div>}
                    {success && <div className="success-message">{success}</div>}

                    {/* Form */}
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">📝 Họ và tên</label>
                            <input
                                type="text"
                                name="fullName"
                                className="form-input"
                                placeholder="Nhập họ tên của bạn..."
                                value={formData.fullName}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">👤 Tên đăng nhập</label>
                            <input
                                type="text"
                                name="username"
                                className="form-input"
                                placeholder="Chọn tên đăng nhập..."
                                value={formData.username}
                                onChange={handleChange}
                                required
                                autoComplete="username"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">🔑 Mật khẩu</label>
                            <input
                                type="password"
                                name="password"
                                className="form-input"
                                placeholder="Tạo mật khẩu (ít nhất 6 ký tự)..."
                                value={formData.password}
                                onChange={handleChange}
                                required
                                autoComplete="new-password"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">🔒 Xác nhận mật khẩu</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                className="form-input"
                                placeholder="Nhập lại mật khẩu..."
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                                autoComplete="new-password"
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ width: '100%', marginTop: '8px' }}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <span className="loading-spinner" style={{ width: '20px', height: '20px' }}></span>
                                    Đang xử lý...
                                </>
                            ) : (
                                <>🚀 Đăng Ký Ngay</>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="auth-footer">
                        Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
