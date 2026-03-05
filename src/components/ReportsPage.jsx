import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from 'recharts';
import { HiOutlineCurrencyRupee, HiOutlineTrendingDown, HiOutlineCreditCard } from 'react-icons/hi';
import {
    getDashboardStats,
    getMonthlyTrends,
    getDeductionCategories,
    getPaymentMethodDistribution,
    subscribeToTransactions,
} from '../logic/firestoreService';
import { getCurrentUser } from '../logic/storage';

const COLORS = ['#818cf8', '#c084fc', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

const ChartTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="chart-tooltip">
                <p><strong>{label || payload[0].name}</strong></p>
                {payload.map((p, i) => (
                    <p key={i} style={{ color: p.color || p.fill }}>
                        {p.name}: ₹{Number(p.value).toLocaleString()}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

const PieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="chart-tooltip">
                <p><strong>{payload[0].name}</strong></p>
                <p>₹{Number(payload[0].value).toLocaleString()}</p>
                <p>{payload[0].payload.count} transactions</p>
            </div>
        );
    }
    return null;
};

const ReportsPage = ({ user: userProp }) => {
    const user = userProp || getCurrentUser();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) { setLoading(false); return; }
        const unsubscribe = subscribeToTransactions(user.uid || user.username, (transactions) => {
            setData(transactions);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user?.uid, user?.username]); // eslint-disable-line react-hooks/exhaustive-deps

    const stats = useMemo(() => {
        try {
            return getDashboardStats(data || []);
        } catch (e) {
            console.error('ReportsPage stats error:', e);
            return { totalTxns: 0, totalVolume: 0, totalSettled: 0, totalDeductions: 0, anomalies: 0 };
        }
    }, [data]);

    const trends = useMemo(() => {
        try {
            return getMonthlyTrends(data || []);
        } catch (e) {
            console.error('ReportsPage trends error:', e);
            return [];
        }
    }, [data]);

    const deductions = useMemo(() => {
        try {
            return getDeductionCategories(data || []);
        } catch (e) {
            console.error('ReportsPage deductions error:', e);
            return [];
        }
    }, [data]);

    const methods = useMemo(() => {
        try {
            return getPaymentMethodDistribution(data || []);
        } catch (e) {
            console.error('ReportsPage methods error:', e);
            return [];
        }
    }, [data]);

    if (loading) return (
        <div className="loading-overlay">
            <div className="loading-spinner" />
        </div>
    );

    return (
        <div className="page-container animate-fade-in">
            <header className="page-header">
                <div>
                    <h1 className="page-title gradient-text">Performance Reports</h1>
                    <p className="page-subtitle">Your payment performance at a glance</p>
                </div>
            </header>

            {/* Summary Row */}
            <div className="report-stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                {[
                    { label: 'Total Sales', value: stats.totalVolume, icon: HiOutlineCurrencyRupee, color: '#818cf8', bg: 'rgba(129,140,248,0.12)', accent: '#818cf8' },
                    { label: 'Total Fees', value: stats.totalDeductions, icon: HiOutlineTrendingDown, color: '#f43f5e', bg: 'rgba(244,63,94,0.1)', accent: '#f43f5e' },
                    { label: 'Received in Bank', value: stats.totalSettled, icon: HiOutlineCreditCard, color: '#10b981', bg: 'rgba(16,185,129,0.12)', accent: '#10b981' }
                ].map((s, i) => (
                    <motion.div
                        key={i}
                        className="card glass-panel"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem', borderTop: `2px solid ${s.accent}40` }}
                    >
                        <div className="stat-icon-wrap" style={{ background: s.bg, color: s.color, width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                            <s.icon />
                        </div>
                        <div>
                            <span className="stat-label">{s.label}</span>
                            <div className="stat-value" style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.3rem', color: s.color }}>
                                ₹{s.value.toLocaleString()}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Main Charts */}
            <div className="charts-grid">
                <motion.div
                    className="card glass-panel chart-card wide"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="card-header-row" style={{ marginBottom: '1.5rem' }}>
                        <h3 className="card-title">Sales vs Bank Deposits</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={320}>
                        <AreaChart data={trends} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                            <defs>
                                <linearGradient id="volGradR" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="setGradR" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                            <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<ChartTooltip />} />
                            <Area type="monotone" dataKey="volume" name="Total Sales" stroke="#818cf8" fill="url(#volGradR)" strokeWidth={2.5} dot={false} />
                            <Area type="monotone" dataKey="settled" name="Received in Bank" stroke="#10b981" fill="url(#setGradR)" strokeWidth={2.5} dot={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </motion.div>

                <motion.div
                    className="card glass-panel chart-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>Fee Breakdown</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={deductions || []} layout="vertical">
                            <XAxis type="number" hide />
                            <YAxis
                                type="category"
                                dataKey="category"
                                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                                width={120}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                            <Bar dataKey="amount" name="Amount" radius={[0, 4, 4, 0]} barSize={20}>
                                {(deductions || []).map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </motion.div>

                <motion.div
                    className="card glass-panel chart-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>Payment Methods</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={methods}
                                cx="50%"
                                cy="45%"
                                innerRadius={70}
                                outerRadius={100}
                                paddingAngle={4}
                                dataKey="value"
                                nameKey="name"
                                stroke="none"
                            >
                                {methods.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<PieTooltip />} />
                            <Legend
                                verticalAlign="bottom"
                                height={36}
                                formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'capitalize' }}>{value}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </motion.div>
            </div>
        </div>
    );
};

export default ReportsPage;
