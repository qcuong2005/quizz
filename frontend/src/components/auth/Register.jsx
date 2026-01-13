import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../../services/authService';
import '../../styles/TetTheme.css';

const Register = () => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        fullName: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    // Handle flowers generation
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
        setSuccess('');

        if (formData.password !== formData.confirmPassword) {
            setError('Mật khẩu nhập lại không khớp!');
            return;
        }

        try {
            await register(formData.username, formData.password, formData.fullName);
            setSuccess('Đăng ký thành công! Đang chuyển hướng...');
            setTimeout(() => {
                navigate('/login');
            }, 2000);
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

                    <h1 className="auth-title">Đăng Ký</h1>

                    {error && <div className="error-message">{error}</div>}
                    {success && <div className="success-message">{success}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Họ và tên</label>
                            <input
                                type="text"
                                name="fullName"
                                className="form-input"
                                placeholder="Nhập họ tên của bạn"
                                value={formData.fullName}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Tên đăng nhập</label>
                            <input
                                type="text"
                                name="username"
                                className="form-input"
                                placeholder="Chọn tên đăng nhập"
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

                        <div className="form-group">
                            <label className="form-label">Nhập lại mật khẩu</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                className="form-input"
                                placeholder="Xác nhận mật khẩu"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <button type="submit" className="btn-tet">
                            Đăng Ký Ngay
                        </button>
                    </form>

                    <div className="auth-link">
                        Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
