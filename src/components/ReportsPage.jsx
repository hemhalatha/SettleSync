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

const COLORS = ['#818cf8', '#c084fc', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

const ReportsPage = ({ user, showToast }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = subscribeToTransactions(user.uid || user.username, (transactions) => {
            setData(transactions);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    const stats = useMemo(() => getDashboardStats(data), [data]);
    const trends = useMemo(() => getMonthlyTrends(), []); // Placeholder trends
    const categories = useMemo(() => getDeductionCategories(), []); // These should ideally use 'data' too
    const methods = useMemo(() => getPaymentMethodDistribution(), []); // These should ideally use 'data' too

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

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title gradient-text">Reports & Analytics</h1>
                    <p className="page-subtitle">Comprehensive insights into your payment data</p>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="report-stats-row">
                <motion.div className="card glass-panel report-stat" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <HiOutlineCurrencyRupee className="report-stat-icon" style={{ color: '#818cf8' }} />
                    <div>
                        <span className="stat-label">Total Volume</span>
                        <span className="stat-value">₹{stats.totalVolume.toLocaleString()}</span>
                    </div>
                </motion.div>
                <motion.div className="card glass-panel report-stat" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <HiOutlineTrendingDown className="report-stat-icon" style={{ color: '#ef4444' }} />
                    <div>
                        <span className="stat-label">Total Deductions</span>
                        <span className="stat-value">₹{stats.totalDeductions.toLocaleString()}</span>
                    </div>
                </motion.div>
                <motion.div className="card glass-panel report-stat" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <HiOutlineCreditCard className="report-stat-icon" style={{ color: '#10b981' }} />
                    <div>
                        <span className="stat-label">Net Settled</span>
                        <span className="stat-value">₹{stats.totalSettled.toLocaleString()}</span>
                    </div>
                </motion.div>
            </div>

            {/* Charts Grid */}
            <div className="charts-grid">
                {/* Area Chart – Monthly Trends */}
                <motion.div
                    className="card glass-panel chart-card wide"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <h3 className="card-title">Monthly Transaction Trends</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={trends}>
                            <defs>
                                <linearGradient id="rvGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="rsGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<ChartTooltip />} />
                            <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                            <Area type="monotone" dataKey="volume" name="Volume" stroke="#818cf8" fill="url(#rvGrad)" strokeWidth={2} />
                            <Area type="monotone" dataKey="settled" name="Settled" stroke="#10b981" fill="url(#rsGrad)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </motion.div>

                {/* Bar Chart – Deduction Categories */}
                <motion.div
                    className="card glass-panel chart-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <h3 className="card-title">Deduction by Category</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={categories} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis
                                type="category"
                                dataKey="category"
                                tick={{ fill: '#94a3b8', fontSize: 10 }}
                                width={140}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<ChartTooltip />} />
                            <Bar dataKey="amount" name="Amount" radius={[0, 6, 6, 0]}>
                                {categories.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </motion.div>

                {/* Donut Chart – Payment Method Distribution */}
                <motion.div
                    className="card glass-panel chart-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <h3 className="card-title">Payment Method Distribution</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                            <Pie
                                data={methods}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={3}
                                dataKey="value"
                                nameKey="name"
                            >
                                {methods.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<PieTooltip />} />
                            <Legend
                                wrapperStyle={{ color: '#94a3b8', fontSize: 12 }}
                                formatter={(value) => <span style={{ color: '#e2e8f0', textTransform: 'capitalize' }}>{value}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </motion.div>
            </div>
        </div>
    );
};

export default ReportsPage;
