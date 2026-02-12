import React, { useState } from 'react';
import { login, signup } from '../logic/storage';

const AuthPage = ({ onLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        try {
            const user = isLogin ? login(username, password) : signup(username, password);
            onLogin(user);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="auth-container animate-fade-in">
            <div className="card glass-panel auth-card">
                <div className="auth-tabs">
                    <button
                        className={`auth-tab ${isLogin ? 'active' : ''}`}
                        onClick={() => { setIsLogin(true); setError(''); }}
                    >
                        Login
                    </button>
                    <button
                        className={`auth-tab ${!isLogin ? 'active' : ''}`}
                        onClick={() => { setIsLogin(false); setError(''); }}
                    >
                        Sign Up
                    </button>
                </div>

                <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                    {isLogin ? 'Welcome Back' : 'Create Account'}
                </h2>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Username</label>
                        <input
                            type="text"
                            className="form-input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            placeholder="e.g. hemhalatha"
                        />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            className="form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                        />
                    </div>
                    <button type="submit" className="btn-primary btn-full">
                        {isLogin ? 'Sign In' : 'Create Account'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AuthPage;
