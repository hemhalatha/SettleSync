import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Dashboard from './components/Dashboard';
import AuthPage from './components/AuthPage';
import OnboardingPage from './components/OnboardingPage';
import TransactionsPage from './components/TransactionsPage';
import ReportsPage from './components/ReportsPage';
import LedgerPage from './components/LedgerPage';

import SettingsPage from './components/SettingsPage';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import { getCurrentUser, logoutUser } from './logic/storage';
import { motion } from 'framer-motion';
import './styles/styles.css';

// Protected route wrapper
const ProtectedRoute = ({ user, children }) => {
  if (!user) return <Navigate to="/login" replace />;
  if (!user.onboarded) return <Navigate to="/onboarding" replace />;
  return children;
};

// Layout with sidebar
const AppLayout = ({ user, onLogout, children, toast, setToast }) => (
  <div className="app-layout">
    {/* Background Decorative Orbs */}
    <div className="bg-orb orb-1" />
    <div className="bg-orb orb-2" />
    <Sidebar user={user} onLogout={onLogout} />
    <main className="main-content">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </main>
    {toast && (
      <Toast
        type={toast.type}
        message={toast.message}
        onClose={() => setToast(null)}
      />
    )}
  </div>
);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const currentUser = getCurrentUser();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(currentUser);
    setLoading(false);
  }, []);

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    setToast({ type: 'info', message: 'Logged out successfully' });
  };

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    setToast({ type: 'success', message: `Welcome back, ${loggedInUser.username}!` });
  };

  const handleOnboardingComplete = (updatedUser) => {
    const resolvedUser = updatedUser || getCurrentUser();
    setUser(resolvedUser);
    setToast({ type: 'success', message: 'Profile setup complete! Welcome to SettleSync.' });
  };

  const showToast = (type, message) => {
    setToast({ type, message });
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading SettleSync...</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Public routes */}
          <Route
            path="/login"
            element={
              user && user.onboarded ? (
                <Navigate to="/dashboard" replace />
              ) : user && !user.onboarded ? (
                <Navigate to="/onboarding" replace />
              ) : (
                <AuthPage onLogin={handleLogin} />
              )
            }
          />

          <Route
            path="/onboarding"
            element={
              !user ? (
                <Navigate to="/login" replace />
              ) : user.onboarded ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <OnboardingPage onComplete={handleOnboardingComplete} />
              )
            }
          />

          {/* Protected routes with sidebar layout */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute user={user}>
                <AppLayout user={user} onLogout={handleLogout} toast={toast} setToast={setToast}>
                  <Dashboard showToast={showToast} />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/transactions"
            element={
              <ProtectedRoute user={user}>
                <AppLayout user={user} onLogout={handleLogout} toast={toast} setToast={setToast}>
                  <TransactionsPage user={user} showToast={showToast} />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/ledger"
            element={
              <ProtectedRoute user={user}>
                <AppLayout user={user} onLogout={handleLogout} toast={toast} setToast={setToast}>
                  <LedgerPage user={user} showToast={showToast} />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute user={user}>
                <AppLayout user={user} onLogout={handleLogout} toast={toast} setToast={setToast}>
                  <ReportsPage user={user} showToast={showToast} />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute user={user}>
                <AppLayout user={user} onLogout={handleLogout} toast={toast} setToast={setToast}>
                  <SettingsPage user={user} setUser={setUser} showToast={showToast} />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
        </Routes>
      </AnimatePresence>
    </ErrorBoundary>
  );
}

export default App;
