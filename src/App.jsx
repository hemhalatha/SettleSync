import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import AuthPage from './components/AuthPage';
import OnboardingPage from './components/OnboardingPage';
import { getCurrentUser, logout } from './logic/storage';
import './styles/styles.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  const handleLogout = () => {
    logout();
    setUser(null);
  };

  if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Loading...</div>;

  if (!user) {
    return <AuthPage onLogin={setUser} />;
  }

  if (!user.onboarded) {
    return <OnboardingPage onComplete={setUser} />;
  }

  return (
    <div className="App">
      <nav style={{ padding: '1rem 2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>Logged in as <strong>{user.username}</strong></span>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </nav>
      <Dashboard />
    </div>
  );
}

export default App;
