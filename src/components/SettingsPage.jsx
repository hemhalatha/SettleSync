import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    HiOutlineGlobeAlt,
    HiOutlineSave,
    HiOutlineShieldCheck,
    HiOutlineCurrencyRupee,
    HiOutlineRefresh,
    HiOutlineLightningBolt,
} from 'react-icons/hi';
import { getCurrentUser, updateUserSettings } from '../logic/storage';
import { merchantPricing } from '../data/mockData';
import { SERVER_URL } from '../logic/firestoreService';

const SettingsPage = ({ user, setUser, showToast }) => {
    const currentUser = getCurrentUser() || user;
    const [serverStatus, setServerStatus] = useState('checking');
    const [gatewayKey, setGatewayKey] = useState(currentUser?.gatewayKeyId || currentUser?.bankDetails?.gatewayKeyId || '');
    const [saving, setSaving] = useState(false);
    const [seeding, setSeeding] = useState(false);

    const webhookUrl = `${SERVER_URL}/webhooks/razorpay`;

    // Check server health on mount
    useEffect(() => {
        checkServer();
    }, []);

    const checkServer = async () => {
        setServerStatus('checking');
        try {
            const res = await fetch(`${SERVER_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
            if (res.ok) {
                const data = await res.json();
                setServerStatus(data.firebase === 'connected' ? 'connected' : 'running');
            } else {
                setServerStatus('error');
            }
        } catch {
            setServerStatus('offline');
        }
    };

    const handleSaveGateway = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const updated = await updateUserSettings({
                gatewayKeyId: gatewayKey,
                gatewayProvider: 'Razorpay',
                webhookUrl,
            });
            if (updated && setUser) setUser(updated);
            showToast('success', 'Gateway settings saved');
        } catch {
            showToast('error', 'Failed to save');
        }
        setSaving(false);
    };

    const handleSeedData = async () => {
        setSeeding(true);
        try {
            const userId = currentUser?.uid || currentUser?.username || 'default_merchant';
            const res = await fetch(`${SERVER_URL}/api/seed/${userId}`, { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                showToast('success', `Added ${data.count} sample payments`);
            } else {
                showToast('error', 'Server returned an error');
            }
        } catch {
            showToast('error', 'Could not reach server. Make sure it is running.');
        }
        setSeeding(false);
    };

    const handleSimulate = async () => {
        try {
            const userId = currentUser?.uid || currentUser?.username || 'default_merchant';
            const res = await fetch(`${SERVER_URL}/api/simulate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });
            if (res.ok) {
                const data = await res.json();
                showToast('success', `Simulated ₹${data.transaction?.transaction_amount} ${data.transaction?.payment_method} payment`);
            } else {
                showToast('error', 'Simulation failed');
            }
        } catch {
            showToast('error', 'Could not reach server. Start it with: cd server && npm start');
        }
    };

    const statusConfig = {
        checking: { label: 'Checking...', color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.05)' },
        connected: { label: 'Connected (Firestore)', color: 'var(--success)', bg: 'rgba(16,185,129,0.1)' },
        running: { label: 'Running (Memory Mode)', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
        offline: { label: 'Offline — Start server', color: 'var(--danger)', bg: 'rgba(239,68,68,0.1)' },
        error: { label: 'Error', color: 'var(--danger)', bg: 'rgba(239,68,68,0.1)' },
    };

    const status = statusConfig[serverStatus] || statusConfig.offline;

    return (
        <div className="page-container animate-fade-in">
            <header className="page-header">
                <div>
                    <h1 className="page-title gradient-text">Settings</h1>
                    <p className="page-subtitle">Manage your gateway connection and account</p>
                </div>
            </header>

            <div className="settings-grid">
                {/* Gateway Connection */}
                <motion.div
                    className="card glass-panel settings-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="settings-card-header">
                        <div className="stat-icon-wrap" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                            <HiOutlineGlobeAlt />
                        </div>
                        <h3 className="card-title" style={{ margin: 0 }}>Gateway Connection</h3>
                    </div>

                    {/* Server Status */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0.75rem 1rem', marginTop: '1.5rem',
                        background: status.bg, borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--glass-border)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: status.color }} />
                            <span style={{ fontSize: '0.85rem', color: status.color, fontWeight: 600 }}>{status.label}</span>
                        </div>
                        <button
                            className="btn-secondary btn-sm"
                            onClick={checkServer}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                            <HiOutlineRefresh size={14} /> Refresh
                        </button>
                    </div>

                    <form onSubmit={handleSaveGateway} className="settings-form" style={{ marginTop: '1.5rem' }}>
                        <div className="form-group">
                            <label>Razorpay Key ID</label>
                            <input
                                type="text"
                                className="form-input mono"
                                value={gatewayKey}
                                onChange={(e) => setGatewayKey(e.target.value)}
                                placeholder="rzp_test_xxxxxxxxxxxxx"
                            />
                        </div>
                        <div className="form-group">
                            <label>Webhook URL</label>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)',
                                borderRadius: 'var(--radius-md)', padding: '0.6rem 0.75rem',
                            }}>
                                <code style={{ fontSize: '0.8rem', color: 'var(--primary)', flex: 1, wordBreak: 'break-all' }}>
                                    {webhookUrl}
                                </code>
                                <button
                                    type="button"
                                    className="btn-secondary btn-sm"
                                    onClick={() => { navigator.clipboard.writeText(webhookUrl); showToast('success', 'Copied!'); }}
                                    style={{ flexShrink: 0 }}
                                >
                                    Copy
                                </button>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem', display: 'block' }}>
                                Register this URL in Razorpay Dashboard → Webhooks
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <button type="submit" className="btn-primary btn-with-icon" disabled={saving}>
                                <HiOutlineSave strokeWidth={2} />
                                <span>{saving ? 'Saving...' : 'Save'}</span>
                            </button>
                            <button
                                type="button"
                                className="btn-secondary btn-with-icon"
                                onClick={handleSimulate}
                                title="Send a test payment through the server"
                            >
                                <HiOutlineLightningBolt strokeWidth={2} />
                                <span>Test Payment</span>
                            </button>
                        </div>
                    </form>

                    {/* Seed Data */}
                    <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Load Sample Data</span>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                                    Add 8 realistic demo payments to see how everything works
                                </p>
                            </div>
                            <button
                                className="btn-secondary btn-sm"
                                onClick={handleSeedData}
                                disabled={seeding}
                            >
                                {seeding ? 'Loading...' : 'Load Demo'}
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Fee Structure */}
                <motion.div
                    className="card glass-panel settings-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="settings-card-header">
                        <div className="stat-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
                            <HiOutlineCurrencyRupee />
                        </div>
                        <h3 className="card-title" style={{ margin: 0 }}>Fee Structure</h3>
                    </div>

                    <div className="pricing-rules" style={{ marginTop: '1.5rem' }}>
                        {[
                            { label: 'Transaction Fee', value: `${merchantPricing.mdrPercentage}%` },
                            { label: 'Tax (GST)', value: `${merchantPricing.gstPercentage}%` },
                            { label: 'Refund Fee', value: `₹${merchantPricing.refundFee}` },
                            { label: 'Dispute Fee', value: `₹${merchantPricing.chargebackFee}` }
                        ].map((rule, i) => (
                            <div key={i} className="pricing-rule">
                                <span className="pricing-label">{rule.label}</span>
                                <span className="pricing-value">{rule.value}</span>
                            </div>
                        ))}
                    </div>

                    <div className="auth-hint" style={{ marginTop: '2rem', textAlign: 'left', fontSize: '0.8rem' }}>
                        <p style={{ margin: 0 }}>
                            <strong>Note:</strong> Fee rates are set by your payment gateway.
                            Contact Razorpay support to request a rate review.
                        </p>
                    </div>
                </motion.div>

                {/* Account */}
                <motion.div
                    className="card glass-panel settings-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="settings-card-header">
                        <div className="stat-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--info)' }}>
                            <HiOutlineShieldCheck />
                        </div>
                        <h3 className="card-title" style={{ margin: 0 }}>Your Account</h3>
                    </div>

                    <div className="account-info" style={{ marginTop: '1.5rem' }}>
                        <div className="account-info-row">
                            <span className="account-label">Username</span>
                            <span className="account-value mono">{currentUser?.username || 'user_demo'}</span>
                        </div>
                        <div className="account-info-row">
                            <span className="account-label">Email</span>
                            <span className="account-value">{currentUser?.email || 'N/A'}</span>
                        </div>
                        <div className="account-info-row" style={{ marginTop: '1rem' }}>
                            <span className="account-label">Verification</span>
                            <span className="badge badge-success">Verified</span>
                        </div>
                        <div className="account-info-row">
                            <span className="account-label">Account Status</span>
                            <span className={`badge ${currentUser?.onboarded ? 'badge-info' : 'badge-warning'}`}>
                                {currentUser?.onboarded ? 'Active' : 'Pending Setup'}
                            </span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default SettingsPage;
