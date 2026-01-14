import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../../services/authService';
import '../../styles/GlobalStyles.css';

const Login = () => {
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });
    const [error, setError] = useState('');
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
        setIsLoading(true);

        try {
            const data = await login(formData.username, formData.password);
            console.log("Login success:", data);
            navigate('/');
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
                        <span className="auth-icon">🔐</span>
                        <h1 className="auth-title">Đăng Nhập</h1>
                        <p className="auth-subtitle">Chào mừng trở lại! Hãy tiếp tục hành trình tri thức 🚀</p>
                    </div>

                    {/* Error Message */}
                    {error && <div className="error-message">⚠️ {error}</div>}

                    {/* Form */}
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">👤 Tên đăng nhập</label>
                            <input
                                type="text"
                                name="username"
                                className="form-input"
                                placeholder="Nhập tên đăng nhập..."
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
                                placeholder="Nhập mật khẩu..."
                                value={formData.password}
                                onChange={handleChange}
                                required
                                autoComplete="current-password"
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
                                    Đang đăng nhập...
                                </>
                            ) : (
                                <>🚀 Đăng Nhập</>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="auth-footer">
                        Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
