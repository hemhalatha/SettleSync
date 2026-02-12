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
} from 'react-icons/hi';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
    getDashboardStats,
    getMonthlyTrends,
    processIncomingWebhook,
    subscribeToTransactions,
} from '../logic/firestoreService';
import { merchantPricing } from '../data/mockData';
import { generateLedgerEntries } from '../logic/ledger';
import BreakdownModal from './BreakdownModal';

const statCards = [
    { key: 'totalVolume', label: 'Total Volume', icon: HiOutlineCurrencyRupee, color: '#818cf8', prefix: '₹' },
    { key: 'totalSettled', label: 'Settled Amount', icon: HiOutlineTrendingUp, color: '#10b981', prefix: '₹' },
    { key: 'totalTxns', label: 'Transactions', icon: HiOutlineCreditCard, color: '#3b82f6', prefix: '' },
    { key: 'anomalies', label: 'Anomalies', icon: HiOutlineExclamation, color: '#f59e0b', prefix: '' },
];

const AnimatedCounter = ({ value, prefix = '' }) => {
    return (
        <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            {prefix}{typeof value === 'number' ? value.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : value}
        </motion.span>
    );
};

const Dashboard = ({ user, showToast }) => {
    const [selectedTxn, setSelectedTxn] = React.useState(null);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Subscribe to real-time transactions
        const unsubscribe = subscribeToTransactions(user.uid || user.username, (transactions) => {
            setData(transactions);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const stats = useMemo(() => getDashboardStats(data), [data]);
    const trends = useMemo(() => getMonthlyTrends(), []); // Trends might also need to depend on data if they are derived from it
    const recentTransactions = useMemo(() => data.slice(0, 5), [data]);

    const handleSimulateWebhook = async () => {
        const randomAmount = Math.floor(Math.random() * 5000) + 500;
        const methods = ['upi', 'credit_card', 'debit_card', 'net_banking'];
        const payload = {
            transaction_id: `TXN_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            order_id: `ORD_${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
            timestamp: new Date().toISOString(),
            transaction_amount: randomAmount,
            settled_amount: randomAmount * 0.97, // Simulate some deduction
            payment_method: methods[Math.floor(Math.random() * methods.length)],
            status: 'success'
        };

        try {
            showToast('info', 'Simulating incoming webhook...');
            await processIncomingWebhook(user.uid || user.username, payload, merchantPricing);
            showToast('success', 'Webhook processed! Dashboard updated in real-time.');
        } catch (error) {
            showToast('error', 'Failed to simulate webhook.');
        }
    };

    const ledgerEntries = useMemo(() => generateLedgerEntries(data), [data]);
    const ledgerBalance = ledgerEntries.length > 0 ? ledgerEntries[ledgerEntries.length - 1].runningBalance : 0;

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="chart-tooltip">
                    <p><strong>{payload[0].payload.month}</strong></p>
                    <p style={{ color: '#818cf8' }}>Volume: ₹{payload[0].value.toLocaleString()}</p>
                    {payload[1] && <p style={{ color: '#10b981' }}>Settled: ₹{payload[1].value.toLocaleString()}</p>}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title gradient-text">Executive Overview</h1>
                    <p className="page-subtitle">Real-time payment transparency & settlement health</p>
                </div>
                <div className="page-actions">
                    <button className="btn-secondary btn-sm" onClick={handleSimulateWebhook}>
                        ⚡ Simulate Webhook
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="stats-grid">
                {statCards.map((card, i) => (
                    <motion.div
                        key={card.key}
                        className="card glass-panel stat-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <div className="stat-card-header">
                            <span className="stat-label">{card.label}</span>
                            <div className="stat-icon-wrap" style={{ background: `${card.color}20` }}>
                                <card.icon style={{ color: card.color }} />
                            </div>
                        </div>
                        <span className="stat-value" style={{ color: card.key === 'anomalies' && stats[card.key] > 0 ? '#f59e0b' : undefined }}>
                            <AnimatedCounter value={stats[card.key]} prefix={card.prefix} />
                        </span>
                    </motion.div>
                ))}
            </div>

            {/* Ledger Balance Card + Mini Chart */}
            <div className="dashboard-row">
                <motion.div
                    className="card glass-panel ledger-balance-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <div className="stat-card-header">
                        <span className="stat-label">Ledger Balance</span>
                        <div className="stat-icon-wrap" style={{ background: '#c084fc20' }}>
                            <HiOutlineBookOpen style={{ color: '#c084fc' }} />
                        </div>
                    </div>
                    <span className="stat-value" style={{ color: '#c084fc' }}>
                        ₹{ledgerBalance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                    <p className="stat-detail">{ledgerEntries.length} ledger entries</p>
                </motion.div>

                <motion.div
                    className="card glass-panel chart-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <h3 className="card-title">Transaction Volume Trend</h3>
                    <div className="mini-chart">
                        <ResponsiveContainer width="100%" height={160}>
                            <AreaChart data={trends}>
                                <defs>
                                    <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="setGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis hide />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="volume" stroke="#818cf8" fill="url(#volGrad)" strokeWidth={2} />
                                <Area type="monotone" dataKey="settled" stroke="#10b981" fill="url(#setGrad)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
                <h3 className="section-title">Quick Actions</h3>
                <div className="quick-actions-grid">
                    <Link to="/transactions" className="quick-action-card glass-panel">
                        <HiOutlineCreditCard className="qa-icon" />
                        <span>View Transactions</span>
                        <HiOutlineArrowRight className="qa-arrow" />
                    </Link>
                    <Link to="/ledger" className="quick-action-card glass-panel">
                        <HiOutlineBookOpen className="qa-icon" />
                        <span>Open Ledger</span>
                        <HiOutlineArrowRight className="qa-arrow" />
                    </Link>
                    <Link to="/reports" className="quick-action-card glass-panel">
                        <HiOutlineChartBar className="qa-icon" />
                        <span>View Reports</span>
                        <HiOutlineArrowRight className="qa-arrow" />
                    </Link>
                </div>
            </div>

            {/* Anomaly Alert */}
            {stats.anomalies > 0 && (
                <motion.div
                    className="anomaly-banner glass-panel"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <HiOutlineExclamation className="anomaly-icon" />
                    <div>
                        <strong>{stats.anomalies} anomal{stats.anomalies === 1 ? 'y' : 'ies'} detected</strong>
                        <p>Some transactions have unexplained deductions. Review in the Transactions page.</p>
                    </div>
                    <Link to="/transactions" className="btn-primary btn-sm">Review →</Link>
                </motion.div>
            )}

            {/* Recent Transactions */}
            <div className="card glass-panel recent-txns-card">
                <div className="card-header-row">
                    <h3 className="card-title">Recent Transactions</h3>
                    <Link to="/transactions" className="view-all-link">View All →</Link>
                </div>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Txn ID</th>
                                <th>Method</th>
                                <th>Amount</th>
                                <th>Settled</th>
                                <th>Attribution</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentTxns.map((txn) => (
                                <tr key={txn.transaction_id}>
                                    <td style={{ fontWeight: 500 }}>{txn.transaction_id}</td>
                                    <td style={{ textTransform: 'capitalize' }}>{txn.payment_method.replace('_', ' ')}</td>
                                    <td>₹{txn.transaction_amount.toFixed(2)}</td>
                                    <td style={{ color: '#10b981' }}>₹{txn.settled_amount.toFixed(2)}</td>
                                    <td>
                                        <span className={`badge ${txn.attribution === 'Correct Settlement' ? 'badge-success' : txn.attribution.includes('Anomaly') ? 'badge-danger' : 'badge-info'}`}>
                                            {txn.attribution}
                                        </span>
                                    </td>
                                    <td>
                                        <button className="btn-primary btn-sm" onClick={() => setSelectedTxn(txn)}>
                                            Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <BreakdownModal transaction={selectedTxn} onClose={() => setSelectedTxn(null)} />
        </div>
    );
};

export default Dashboard;
