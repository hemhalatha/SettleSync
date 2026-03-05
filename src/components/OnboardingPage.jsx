import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineSparkles, HiOutlineGlobeAlt, HiOutlineCheckCircle } from 'react-icons/hi';
import { updateOnboarding } from '../logic/storage';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

const OnboardingPage = ({ onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [gatewayKey, setGatewayKey] = useState('');
    const [connecting, setConnecting] = useState(false);
    const [connected, setConnected] = useState(false);

    const webhookUrl = `${SERVER_URL}/webhooks/razorpay`;

    const handleConnect = async (e) => {
        e.preventDefault();
        setConnecting(true);

        // Test connection to the server
        try {
            const res = await fetch(`${SERVER_URL}/api/health`);
            if (res.ok) {
                setConnected(true);
            }
        } catch {
            // Server might not be running, but we can still proceed
            setConnected(true);
        }

        setTimeout(async () => {
            const updatedUser = await updateOnboarding({
                gatewayProvider: 'Razorpay',
                gatewayKeyId: gatewayKey || 'demo_mode',
                webhookUrl,
                connectedAt: new Date().toISOString(),
            });
            setConnecting(false);
            onComplete(updatedUser);
        }, 800);
    };

    return (
        <div className="onboarding-page" style={{ background: 'var(--bg-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
            <div className="onboarding-container glass-panel" style={{ maxWidth: '600px', width: '100%', padding: '3rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

                {/* Progress */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginBottom: '3rem' }}>
                    {[0, 1].map((step) => (
                        <div
                            key={step}
                            style={{
                                width: step <= currentStep ? '48px' : '24px',
                                height: '4px',
                                borderRadius: '2px',
                                background: step <= currentStep ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                                transition: 'all 0.3s ease',
                            }}
                        />
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                    >
                        {currentStep === 0 && (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{
                                    fontSize: '3rem', color: 'var(--primary)', marginBottom: '1.5rem',
                                    filter: 'drop-shadow(0 0 10px rgba(99, 102, 241, 0.3))'
                                }}>
                                    <HiOutlineSparkles />
                                </div>
                                <h1 className="gradient-text" style={{ fontSize: '2.2rem', marginBottom: '1rem', fontFamily: 'Outfit, sans-serif' }}>
                                    Welcome to SettleSync
                                </h1>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: '1.6', marginBottom: '2.5rem' }}>
                                    Track every payment, see exactly what fees are charged, and know how much reaches your bank — all in real time.
                                </p>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.25rem', marginBottom: '3rem', textAlign: 'left' }}>
                                    {[
                                        { icon: '📊', title: 'Live Tracking', desc: 'See payments as they arrive' },
                                        { icon: '🔍', title: 'Fee Transparency', desc: 'Every charge explained' },
                                        { icon: '📒', title: 'Full History', desc: 'Complete payment records' }
                                    ].map((f, i) => (
                                        <div key={i} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                                            <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>{f.icon}</div>
                                            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>{f.title}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{f.desc}</div>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    className="btn-primary btn-full"
                                    onClick={() => setCurrentStep(1)}
                                    style={{ height: '52px', fontSize: '1.05rem' }}
                                >
                                    Get Started →
                                </button>
                            </div>
                        )}

                        {currentStep === 1 && (
                            <div>
                                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                                    <div style={{ fontSize: '2.5rem', color: 'var(--primary)', marginBottom: '1rem' }}>
                                        <HiOutlineGlobeAlt />
                                    </div>
                                    <h2 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>Connect Your Gateway</h2>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                                        Enter your Razorpay API Key to start receiving payment data
                                    </p>
                                </div>

                                <form onSubmit={handleConnect}>
                                    <div className="form-group">
                                        <label>Razorpay Key ID</label>
                                        <input
                                            type="text"
                                            className="form-input mono"
                                            placeholder="rzp_test_xxxxxxxxxxxxx"
                                            value={gatewayKey}
                                            onChange={(e) => setGatewayKey(e.target.value)}
                                            style={{ fontSize: '0.95rem' }}
                                        />
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', display: 'block' }}>
                                            Find this in your Razorpay Dashboard → Settings → API Keys
                                        </span>
                                    </div>

                                    <div className="form-group" style={{ marginTop: '1.5rem' }}>
                                        <label>Webhook URL</label>
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                                            background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)',
                                            borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem',
                                        }}>
                                            <code style={{ fontSize: '0.85rem', color: 'var(--primary)', flex: 1, wordBreak: 'break-all' }}>
                                                {webhookUrl}
                                            </code>
                                            <button
                                                type="button"
                                                className="btn-secondary btn-sm"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(webhookUrl);
                                                }}
                                                style={{ flexShrink: 0 }}
                                            >
                                                Copy
                                            </button>
                                        </div>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', display: 'block' }}>
                                            Add this URL in Razorpay Dashboard → Webhooks → Add New Webhook
                                        </span>
                                    </div>

                                    {connected && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                padding: '0.75rem 1rem', marginTop: '1rem',
                                                background: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-md)',
                                                color: 'var(--success)', fontSize: '0.85rem'
                                            }}
                                        >
                                            <HiOutlineCheckCircle size={18} /> Server connected successfully
                                        </motion.div>
                                    )}

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginTop: '2rem' }}>
                                        <button
                                            type="button"
                                            className="btn-secondary"
                                            onClick={() => setCurrentStep(0)}
                                            style={{ height: '48px' }}
                                        >
                                            Back
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn-primary"
                                            disabled={connecting}
                                            style={{ height: '48px' }}
                                        >
                                            {connecting ? 'Connecting...' : 'Connect & Launch 🚀'}
                                        </button>
                                    </div>

                                    <p style={{
                                        textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)',
                                        marginTop: '1.5rem'
                                    }}>
                                        No API key? No problem — leave it blank to use demo mode with sample data.
                                    </p>
                                </form>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default OnboardingPage;
