import React from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';


const ChartTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const val = payload[0].value;
        return (
            <div className="chart-tooltip glass-panel" style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--glass-border)', fontSize: '0.8rem' }}>
                <p style={{ margin: 0, fontWeight: 600 }}>₹{Math.abs(val).toLocaleString()}</p>
            </div>
        );
    }
    return null;
};

const BreakdownModal = ({ transaction, onClose }) => {
    // const allTxns = useMemo(() => [], []); // Placeholder or remove if not needed

    if (!transaction) return null;

    // Waterfall chart data
    const waterfallData = [
        { name: 'Sale Amount', value: transaction.transaction_amount, color: 'var(--success)' },
        { name: 'Processing Fee', value: -(transaction.breakdown?.mdr || 0), color: 'var(--danger)' },
        { name: 'Tax (GST)', value: -(transaction.breakdown?.gst || 0), color: 'var(--danger)' },
    ];

    if (transaction.breakdown?.fixedFees > 0) {
        waterfallData.push({ name: 'Other Fees', value: -transaction.breakdown.fixedFees, color: 'var(--warning)' });
    }

    if (transaction.difference > 0.01) {
        waterfallData.push({ name: 'Difference', value: -transaction.difference, color: 'var(--warning)' });
    }

    waterfallData.push({ name: 'You Receive', value: transaction.settled_amount, color: 'var(--primary)' });

    return (
        <div className="modal-overlay" onClick={onClose} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 1100, padding: '1.5rem'
        }}>
            <motion.div
                className="modal-content glass-panel"
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                style={{
                    maxWidth: '800px', width: '100%', maxHeight: '90vh',
                    overflowY: 'auto', padding: '2.5rem', border: '1px solid var(--glass-border)',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.6)'
                }}
            >
                {/* Header */}
                <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
                    <div>
                        <h2 className="gradient-text" style={{ fontSize: '1.85rem', marginBottom: '0.5rem' }}>Payment Details</h2>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Complete breakdown for payment #{transaction.transaction_id}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="close-btn"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >✕</button>
                </div>

                {/* Core Stats Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
                    {[
                        { label: 'Sale Amount', value: transaction.transaction_amount || 0, color: 'var(--text-main)' },
                        { label: 'Method', value: (transaction.payment_method || 'unknown').replace('_', ' '), isLabel: true, color: 'var(--text-main)' },
                        { label: 'Expected to Receive', value: (transaction.transaction_amount || 0) - (transaction.expected_deduction || 0), color: 'var(--primary)' },
                        { label: 'Actually Received', value: transaction.settled_amount || 0, color: 'var(--success)' }
                    ].map((s, i) => (
                        <div key={i} className="stat-card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</span>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '0.25rem', color: s.color, textTransform: s.isLabel ? 'capitalize' : 'none' }}>
                                {s.isLabel ? s.value : `₹${(s.value || 0).toFixed(2)}`}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Content Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2.5rem', marginBottom: '2rem' }}>

                    {/* Visual Analysis */}
                    <div>
                        <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem', fontWeight: 600 }}>Fee Breakdown</h3>
                        <div style={{ height: '220px', width: '100%', background: 'rgba(255,255,255,0.01)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={waterfallData}>
                                    <XAxis dataKey="name" hide />
                                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={32}>
                                        {waterfallData.map((entry, i) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Detailed Breakdown */}
                    <div>
                        <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem', fontWeight: 600 }}>How It Was Calculated</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--glass-border)' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Expected Fees</span>
                                <span style={{ color: 'var(--danger)', fontWeight: 600 }}>- ₹{(transaction.expected_deduction || 0).toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--glass-border)' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Unexplained Difference</span>
                                <span style={{ color: (transaction.difference || 0) > 0 ? 'var(--warning)' : 'var(--text-muted)', fontWeight: 600 }}>
                                    - ₹{(transaction.difference || 0).toFixed(2)}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem' }}>
                                <span style={{ fontWeight: 700 }}>Amount Received</span>
                                <span style={{ color: 'var(--success)', fontWeight: 800, fontSize: '1.25rem' }}>₹{(transaction.settled_amount || 0).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Intelligence Analysis */}
                <div style={{ background: 'var(--primary-gradient)', padding: '1px', borderRadius: 'var(--radius-md)', marginBottom: '2rem' }}>
                    <div style={{ background: 'var(--bg-dark)', padding: '1.5rem', borderRadius: 'calc(var(--radius-md) - 1px)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            <div className="badge badge-info" style={{ textTransform: 'uppercase', padding: '0.2rem 0.6rem', fontSize: '0.65rem' }}>Status</div>
                            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)' }}>{(transaction.attribution || 'Processing').replace('Correct Settlement', 'Verified').replace('Unexplained Anomaly', 'Needs Review').replace('Service Surcharge', 'Extra Fee')}</span>
                        </div>
                        <p style={{ fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-secondary)', margin: 0 }}>
                            {transaction.explanation || 'Detailed analysis is being generated for this transaction...'}
                        </p>
                        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--glass-border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Verification</span>
                                <span className={`badge badge-${(transaction.confidence || 'medium').toLowerCase() === 'high' ? 'success' : 'info'}`} style={{ fontSize: '0.75rem' }}>
                                    {transaction.confidence || 'Standard'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Generated by SettleSync &bull; Audit Record
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default BreakdownModal;
