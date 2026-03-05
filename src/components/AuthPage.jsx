import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineEye, HiOutlineEyeOff, HiOutlineMail, HiOutlineUser, HiOutlineLockClosed, HiOutlineShieldCheck } from 'react-icons/hi';
import { loginUser, signupUser } from '../logic/storage';

const features = [
    'Real-time transaction reconciliation',
    'Automated fee attribution & anomaly detection',
    'Double-entry accounting ledger',
    'Comprehensive analytics & reports',
];

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
                if (formData.password.length < 6) throw new Error('Password must be at least 6 characters');
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
                    <motion.div
                        className="auth-hero-logo"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                    >
                        <svg width="72" height="72" viewBox="0 0 30 30" fill="none">
                            <rect width="30" height="30" rx="9" fill="url(#authGrad)" />
                            <path d="M9 15L13 19L21 11" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            <defs>
                                <linearGradient id="authGrad" x1="0" y1="0" x2="30" y2="30">
                                    <stop stopColor="#6366f1" />
                                    <stop offset="1" stopColor="#a855f7" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </motion.div>

                    <motion.h1
                        className="auth-hero-title gradient-text"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.5 }}
                    >
                        SettleSync
                    </motion.h1>

                    <motion.p
                        className="auth-hero-tagline"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                    >
                        The ultimate transparency platform for real-time payment reconciliation and financial intelligence.
                    </motion.p>

                    <div className="auth-hero-features">
                        {features.map((feat, i) => (
                            <motion.div
                                key={i}
                                className="auth-feature"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                            >
                                <span className="auth-feature-dot" />
                                <span>{feat}</span>
                            </motion.div>
                        ))}
                    </div>

                    {/* Trust badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        style={{
                            marginTop: '3rem',
                            display: 'inline-flex', alignItems: 'center', gap: '0.65rem',
                            padding: '0.6rem 1rem',
                            background: 'rgba(16,185,129,0.08)',
                            border: '1px solid rgba(16,185,129,0.2)',
                            borderRadius: '99px',
                            fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600,
                        }}
                    >
                        <HiOutlineShieldCheck style={{ fontSize: '1rem' }} />
                        Bank-grade security & encryption
                    </motion.div>
                </div>

                <div className="auth-hero-decoration">
                    <div className="hero-circle c1" />
                    <div className="hero-circle c2" />
                </div>
            </div>

            {/* Right: Form Panel */}
            <div className="auth-form-panel">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={isLogin ? 'login' : 'signup'}
                        className="auth-form-wrapper"
                        initial={{ opacity: 0, x: 24 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -24 }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                    >
                        <div style={{ marginBottom: '2.5rem' }}>
                            <h2 className="auth-title">{isLogin ? 'Welcome back' : 'Get started'}</h2>
                            <p className="auth-subtitle">
                                {isLogin
                                    ? 'Sign in to access your merchant dashboard'
                                    : 'Create your account to start tracking settlements'}
                            </p>
                        </div>

                        {error && (
                            <motion.div
                                className="auth-error"
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{ marginBottom: '1.5rem' }}
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
                                        placeholder="Enter your username"
                                        autoComplete="username"
                                    />
                                </div>
                            </div>

                            <AnimatePresence>
                                {!isLogin && (
                                    <motion.div
                                        className="form-group"
                                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                        animate={{ opacity: 1, height: 'auto', marginBottom: '1.25rem' }}
                                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                        transition={{ duration: 0.3 }}
                                        style={{ overflow: 'hidden' }}
                                    >
                                        <label>Email Address</label>
                                        <div className="input-with-icon">
                                            <HiOutlineMail className="input-icon" />
                                            <input
                                                type="email"
                                                className="form-input"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                required={!isLogin}
                                                placeholder="name@company.com"
                                                autoComplete="email"
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

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
                                        autoComplete={isLogin ? 'current-password' : 'new-password'}
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() => setShowPassword(!showPassword)}
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <HiOutlineEyeOff /> : <HiOutlineEye />}
                                    </button>
                                </div>
                            </div>

                            <button type="submit" className="btn-primary auth-submit btn-full" disabled={loading}>
                                {loading ? (
                                    <span className="btn-loading">
                                        <div className="spinner" />
                                        <span>Authenticating...</span>
                                    </span>
                                ) : isLogin ? 'Sign In to Dashboard →' : 'Create Merchant Account →'}
                            </button>
                        </form>

                        <div className="auth-switch">
                            {isLogin ? "Don't have an account?" : 'Already have a merchant account?'}{' '}
                            <button type="button" className="auth-switch-btn" onClick={switchMode}>
                                {isLogin ? 'Sign up free' : 'Sign in'}
                            </button>
                        </div>

                        {isLogin && (
                            <div className="auth-hint">
                                <span style={{ marginRight: '0.25rem' }}>🔑</span>
                                Demo credentials: <strong>hemhalatha</strong> / <strong>welcome</strong>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default AuthPage;
