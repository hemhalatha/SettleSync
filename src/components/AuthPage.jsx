import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineEye, HiOutlineEyeOff, HiOutlineMail, HiOutlineUser, HiOutlineLockClosed } from 'react-icons/hi';
import { loginUser, signupUser } from '../logic/storage';

const AuthPage = ({ onLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ username: '', email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                const user = await loginUser(formData.username, formData.password);
                onLogin(user);
            } else {
                if (formData.password.length < 6) {
                    throw new Error('Password must be at least 6 characters');
                }
                const user = await signupUser(formData.username, formData.email, formData.password);
                onLogin(user);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const switchMode = () => {
        setIsLogin(!isLogin);
        setError('');
        setFormData({ username: '', email: '', password: '' });
    };

    return (
        <div className="auth-page">
            {/* Left: Hero Panel */}
            <div className="auth-hero">
                <div className="auth-hero-content">
                    <div className="auth-hero-logo">
                        <svg width="48" height="48" viewBox="0 0 28 28" fill="none">
                            <rect width="28" height="28" rx="8" fill="url(#heroGrad)" />
                            <path d="M8 14L12 18L20 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            <defs>
                                <linearGradient id="heroGrad" x1="0" y1="0" x2="28" y2="28">
                                    <stop stopColor="#818cf8" />
                                    <stop offset="1" stopColor="#c084fc" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                    <h1 className="auth-hero-title">SettleSync</h1>
                    <p className="auth-hero-tagline">Payment Transparency Dashboard</p>

                    <div className="auth-hero-features">
                        <div className="auth-feature">
                            <div className="auth-feature-dot" />
                            <span>Real-time transaction reconciliation</span>
                        </div>
                        <div className="auth-feature">
                            <div className="auth-feature-dot" />
                            <span>Automated fee attribution & anomaly detection</span>
                        </div>
                        <div className="auth-feature">
                            <div className="auth-feature-dot" />
                            <span>Double-entry accounting ledger</span>
                        </div>
                        <div className="auth-feature">
                            <div className="auth-feature-dot" />
                            <span>Comprehensive analytics & reports</span>
                        </div>
                    </div>
                </div>

                <div className="auth-hero-decoration">
                    <div className="hero-circle c1" />
                    <div className="hero-circle c2" />
                    <div className="hero-circle c3" />
                </div>
            </div>

            {/* Right: Form Panel */}
            <div className="auth-form-panel">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={isLogin ? 'login' : 'signup'}
                        className="auth-form-wrapper"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <h2 className="auth-title">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
                        <p className="auth-subtitle">
                            {isLogin
                                ? 'Sign in to access your transparency dashboard'
                                : 'Start tracking your payment settlements'}
                        </p>

                        {error && (
                            <motion.div
                                className="auth-error"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                            >
                                {error}
                            </motion.div>
                        )}

                        <form onSubmit={handleSubmit} className="auth-form">
                            <div className="form-group">
                                <label>Username</label>
                                <div className="input-with-icon">
                                    <HiOutlineUser className="input-icon" />
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        required
                                        placeholder="e.g. hemhalatha"
                                    />
                                </div>
                            </div>

                            {!isLogin && (
                                <motion.div
                                    className="form-group"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                >
                                    <label>Email</label>
                                    <div className="input-with-icon">
                                        <HiOutlineMail className="input-icon" />
                                        <input
                                            type="email"
                                            className="form-input"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            required={!isLogin}
                                            placeholder="name@company.com"
                                        />
                                    </div>
                                </motion.div>
                            )}

                            <div className="form-group">
                                <label>Password</label>
                                <div className="input-with-icon">
                                    <HiOutlineLockClosed className="input-icon" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="form-input"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <HiOutlineEyeOff /> : <HiOutlineEye />}
                                    </button>
                                </div>
                            </div>

                            <button type="submit" className="btn-primary btn-full auth-submit" disabled={loading}>
                                {loading ? (
                                    <span className="btn-loading">
                                        <span className="spinner" />
                                        Processing...
                                    </span>
                                ) : isLogin ? (
                                    'Sign In'
                                ) : (
                                    'Create Account'
                                )}
                            </button>
                        </form>

                        <p className="auth-switch">
                            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
                            <button type="button" className="auth-switch-btn" onClick={switchMode}>
                                {isLogin ? 'Sign Up' : 'Sign In'}
                            </button>
                        </p>

                        {isLogin && (
                            <p className="auth-hint">
                                Demo: <strong>hemhalatha</strong> / <strong>welcome</strong>
                            </p>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default AuthPage;
