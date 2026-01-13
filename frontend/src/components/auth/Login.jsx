import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../../services/authService';
import '../../styles/TetTheme.css';

const Login = () => {
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const [flowers, setFlowers] = useState([]);

    useEffect(() => {
        // Generate random flowers
        const newFlowers = Array.from({ length: 20 }).map((_, i) => ({
            id: i,
            left: Math.random() * 100 + '%',
            animationDuration: Math.random() * 5 + 5 + 's',
            animationDelay: Math.random() * 5 + 's',
            type: Math.random() > 0.5 ? '🌸' : '🌼'
        }));
        setFlowers(newFlowers);
    }, []);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const data = await login(formData.username, formData.password);
            console.log("Login success:", data);
            // Redirect to home or dashboard
            navigate('/');
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="tet-bg">
            {/* Render Flowers */}
            {flowers.map((flower) => (
                <div
                    key={flower.id}
                    className="flower"
                    style={{
                        left: flower.left,
                        animationDuration: flower.animationDuration,
                        animationDelay: flower.animationDelay
                    }}
                >
                    {flower.type}
                </div>
            ))}

            <div className="auth-container">
                <div className="auth-card">
                    <div className="lantern left"></div>
                    <div className="lantern right"></div>

                    <h1 className="auth-title">Đăng Nhập</h1>
                    <p style={{ color: '#ffecb3', marginBottom: '20px' }}>Chào mừng năm mới 2026!</p>

                    {error && <div className="error-message">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Tên đăng nhập</label>
                            <input
                                type="text"
                                name="username"
                                className="form-input"
                                placeholder="Nhập tên đăng nhập"
                                value={formData.username}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Mật khẩu</label>
                            <input
                                type="password"
                                name="password"
                                className="form-input"
                                placeholder="Nhập mật khẩu"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <button type="submit" className="btn-tet">
                            Đăng Nhập
                        </button>
                    </form>

                    <div className="auth-link">
                        Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
