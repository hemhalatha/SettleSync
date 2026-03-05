import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    HiOutlineCurrencyRupee,
    HiOutlineTrendingUp,
    HiOutlineExclamation,
    HiOutlineCreditCard,
    HiOutlineArrowRight,
    HiOutlineBookOpen,
    HiOutlineChartBar,
    HiOutlineLightningBolt,
} from 'react-icons/hi';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import {
    getDashboardStats,
    getMonthlyTrends,
    subscribeToTransactions,
    SERVER_URL,
} from '../logic/firestoreService';
import { getCurrentUser } from '../logic/storage';
import BreakdownModal from './BreakdownModal';

const statCards = [
    { key: 'totalVolume', label: 'Total Sales', icon: HiOutlineCurrencyRupee, color: '#818cf8', bg: 'rgba(129,140,248,0.12)', prefix: '₹' },
    { key: 'totalSettled', label: 'Received in Bank', icon: HiOutlineTrendingUp, color: '#10b981', bg: 'rgba(16,185,129,0.12)', prefix: '₹' },
    { key: 'totalTxns', label: 'Payments', icon: HiOutlineCreditCard, color: '#06b6d4', bg: 'rgba(6,182,212,0.12)', prefix: '' },
    { key: 'anomalies', label: 'Needs Attention', icon: HiOutlineExclamation, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', prefix: '' },
];

const AnimatedCounter = ({ value, prefix = '' }) => (
    <motion.span
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
    >
        {prefix}{typeof value === 'number' ? value.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : (value || 0)}
    </motion.span>
);

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="chart-tooltip glass-panel" style={{ padding: '0.75rem', border: '1px solid var(--glass-border-hover)' }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.75rem' }}>{label}</p>
                {payload.map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.2rem 0' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color }} />
                        <span style={{ color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>
                            {p.name === 'volume' ? 'Sales' : 'Received'}: ₹{Number(p.value || 0).toLocaleString()}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const Dashboard = ({ user: userProp, showToast }) => {
    const user = userProp || getCurrentUser();
    const [selectedTxn, setSelectedTxn] = useState(null);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [greeting, setGreeting] = useState('');

    useEffect(() => {
        const hour = new Date().getHours();
        setGreeting(hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening');

        if (!user) {
            setLoading(false);
            return;
        }

        const identifier = user.uid || user.username;
        if (!identifier) {
            setLoading(false);
            return;
        }

        try {
            const unsubscribe = subscribeToTransactions(identifier, (transactions) => {
                setData(transactions || []);
                setLoading(false);
            });
            return () => unsubscribe && unsubscribe();
        } catch (err) {
            console.error('Dashboard subscription error:', err);
            setLoading(false);
        }
    }, [user?.uid, user?.username]); // eslint-disable-line react-hooks/exhaustive-deps

    const stats = useMemo(() => {
        try {
            return getDashboardStats(data || []);
        } catch (e) {
            console.error('Error calculating dashboard stats:', e);
            return { totalTxns: 0, totalVolume: 0, totalSettled: 0, totalDeductions: 0, anomalies: 0 };
        }
    }, [data]);

    const trends = useMemo(() => {
        try {
            return getMonthlyTrends(data || []) || [];
        } catch (e) {
            console.error('Error fetching monthly trends:', e);
            return [];
        }
    }, [data]);

    const recentTxns = useMemo(() => {
        return Array.isArray(data) ? data.slice(0, 5) : [];
    }, [data]);

    const handleSimulateWebhook = async () => {
        if (!user) {
            showToast('error', 'Please log in first.');
            return;
        }
        try {
            showToast('info', 'Sending test payment...');
            const userId = user.uid || user.username || 'default_merchant';
            const res = await fetch(`${SERVER_URL}/api/simulate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });
            if (res.ok) {
                const result = await res.json();
                showToast('success', `Test payment added: ₹${result.transaction?.transaction_amount} via ${result.transaction?.payment_method}`);
            } else {
                showToast('error', 'Server error. Check if the server is running.');
            }
        } catch (e) {
            console.error('Simulation error:', e);
            showToast('error', 'Could not reach server. Start it with: cd server && npm start');
        }
    };

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner" />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading your payment data...</p>
            </div>
        );
    }

    return (
        <div className="page-container">
            {/* Greeting Header */}
            <motion.header
                className="page-header"
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.3rem', fontWeight: 500 }}>
                        {greeting}, <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{user?.username}</span> 👋
                    </p>
                    <h1 className="page-title gradient-text">Your Business Overview</h1>
                    <p className="page-subtitle" style={{ marginTop: '0.25rem' }}>
                        Track your payments and bank deposits in real time
                    </p>
                </div>
                <div className="page-actions">
                    <div className="live-indicator">
                        <span className="live-dot" />
                        Live
                    </div>
                    <button className="btn-secondary" onClick={handleSimulateWebhook} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <HiOutlineLightningBolt />
                        Add Test Payment
                    </button>
                </div>
            </motion.header>

            {/* Stat Cards */}
            <div className="stats-grid">
                {statCards.map((card, i) => (
                    <motion.div
                        key={card.key}
                        className="card glass-panel stat-card"
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07, duration: 0.4 }}
                        style={{ borderTop: `2px solid ${card.color}30` }}
                    >
                        <div className="stat-card-header">
                            <span className="stat-label">{card.label}</span>
                            <div className="stat-icon-wrap" style={{ background: card.bg, color: card.color }}>
                                <card.icon />
                            </div>
                        </div>
                        <div className="stat-value" style={{ color: card.color }}>
                            <AnimatedCounter value={stats[card.key]} prefix={card.prefix} />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="dashboard-row" style={{ gridTemplateColumns: '1fr' }}>

                <motion.div
                    className="card glass-panel chart-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    style={{ borderTop: '2px solid rgba(99,102,241,0.25)' }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                        <h3 className="section-title" style={{ margin: 0 }}>Sales vs Bank Deposits</h3>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#818cf8' }}>
                                <span style={{ width: '10px', height: '3px', borderRadius: '2px', background: '#818cf8', display: 'inline-block' }} />Total Sales
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981' }}>
                                <span style={{ width: '10px', height: '3px', borderRadius: '2px', background: '#10b981', display: 'inline-block' }} />Received in Bank
                            </span>
                        </div>
                    </div>
                    <div style={{ height: '170px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trends} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="setGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="volume" stroke="#818cf8" fill="url(#volGrad)" strokeWidth={2} dot={false} />
                                <Area type="monotone" dataKey="settled" stroke="#10b981" fill="url(#setGrad)" strokeWidth={2} dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>

            {/* Quick Actions */}
            <section className="quick-actions" style={{ marginTop: '2rem' }}>
                <h3 className="section-title">Quick Actions</h3>
                <div className="quick-actions-grid">
                    {[
                        { to: '/transactions', icon: HiOutlineCreditCard, label: 'All Payments', desc: 'View every payment and its status' },
                        { to: '/ledger', icon: HiOutlineBookOpen, label: 'Payment History', desc: 'Step-by-step record of all money movement' },
                        { to: '/reports', icon: HiOutlineChartBar, label: 'Reports', desc: 'Charts and summaries of your business' }
                    ].map((action, i) => (
                        <motion.div key={action.to} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.08 }}>
                            <Link to={action.to} className="quick-action-card glass-panel">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '10px', background: 'var(--primary-light)', color: 'var(--primary)', flexShrink: 0 }}>
                                    <action.icon style={{ fontSize: '1.2rem' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>{action.label}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{action.desc}</div>
                                </div>
                                <HiOutlineArrowRight className="qa-arrow" />
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Recent Transactions */}
            <section style={{ marginTop: '2.5rem' }}>
                <motion.div
                    className="card glass-panel recent-txns-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    style={{ padding: 0 }}
                >
                    <header className="card-header-row" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--glass-border)' }}>
                        <h3 className="card-title" style={{ margin: 0 }}>Recent Activity</h3>
                        <Link to="/transactions" className="view-all-link">
                            View all <HiOutlineArrowRight style={{ fontSize: '0.8rem' }} />
                        </Link>
                    </header>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Payment ID</th>
                                    <th>Method</th>
                                    <th>Amount</th>
                                    <th>Received</th>
                                    <th>Status</th>
                                    <th className="text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentTxns.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                            No payments recorded yet. Use "Add Test Payment" to see how it works.
                                        </td>
                                    </tr>
                                ) : (
                                    recentTxns.map((txn) => (
                                        <tr key={txn.transaction_id || Math.random()}>
                                            <td className="mono" style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>{txn.transaction_id || 'N/A'}</td>
                                            <td style={{ textTransform: 'capitalize', fontWeight: 600, color: 'var(--text-main)' }}>{(txn.payment_method || 'unknown').replace(/_/g, ' ')}</td>
                                            <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>₹{(txn.transaction_amount || 0).toLocaleString()}</td>
                                            <td style={{ color: 'var(--success)', fontWeight: 700 }}>₹{(txn.settled_amount || 0).toLocaleString()}</td>
                                            <td>
                                                <span className={`badge ${(txn.attribution || '').includes('Correct') ? 'badge-success' : 'badge-warning'}`}>
                                                    {(txn.attribution || 'Pending').replace('Correct Settlement', 'Verified').replace('Unexplained Anomaly', 'Needs Review').replace('Service Surcharge', 'Extra Fee')}
                                                </span>
                                            </td>
                                            <td className="text-right">
                                                <button className="btn-secondary btn-sm" onClick={() => setSelectedTxn(txn)}>
                                                    Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </section>

            <BreakdownModal transaction={selectedTxn} onClose={() => setSelectedTxn(null)} />
        </div>
    );
};

export default Dashboard;
