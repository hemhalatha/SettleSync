import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getProcessedTransactions } from '../logic/firestoreService';
import { getLedgerEntriesForTransaction, generateLedgerEntries } from '../logic/ledger';

const typeConfig = {
    credit: { label: 'Credit', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    debit: { label: 'Debit', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    settlement: { label: 'Settlement', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    refund: { label: 'Refund', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
};

const BreakdownModal = ({ transaction, onClose }) => {
    const allTxns = useMemo(() => getProcessedTransactions(), []);
    const allLedger = useMemo(() => generateLedgerEntries(allTxns), [allTxns]);

    if (!transaction) return null;

    const ledgerEntries = getLedgerEntriesForTransaction(allLedger, transaction.transaction_id);

    // Waterfall chart data
    const waterfallData = [
        { name: 'Gross Amount', value: transaction.transaction_amount, color: '#10b981' },
        { name: 'MDR', value: -(transaction.breakdown?.mdr || 0), color: '#ef4444' },
        { name: 'GST', value: -(transaction.breakdown?.gst || 0), color: '#ef4444' },
    ];

    if (transaction.breakdown?.fixedFees > 0) {
        waterfallData.push({ name: 'Fixed Fees', value: -transaction.breakdown.fixedFees, color: '#f59e0b' });
    }

    if (transaction.difference > 0.01) {
        waterfallData.push({ name: 'Additional', value: -transaction.difference, color: '#f59e0b' });
    }

    waterfallData.push({ name: 'Net Settled', value: transaction.settled_amount, color: '#3b82f6' });

    const ChartTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const val = payload[0].value;
            return (
                <div className="chart-tooltip">
                    <p><strong>{payload[0].payload.name}</strong></p>
                    <p style={{ color: val >= 0 ? '#10b981' : '#ef4444' }}>
                        {val >= 0 ? '+' : ''}₹{Math.abs(val).toFixed(2)}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <motion.div
                className="modal-content glass-panel"
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
            >
                {/* Header */}
                <div className="modal-header">
                    <h2>Transparency Report</h2>
                    <button className="modal-close-btn" onClick={onClose}>✕</button>
                </div>

                {/* Transaction Info */}
                <div className="modal-info-grid">
                    <div className="modal-info-item">
                        <span className="stat-label">Transaction ID</span>
                        <span className="modal-info-value">{transaction.transaction_id}</span>
                    </div>
                    <div className="modal-info-item">
                        <span className="stat-label">Payment Method</span>
                        <span className="modal-info-value" style={{ textTransform: 'capitalize' }}>
                            {transaction.payment_method.replace('_', ' ')}
                        </span>
                    </div>
                    <div className="modal-info-item">
                        <span className="stat-label">Gross Amount</span>
                        <span className="modal-info-value modal-amount">₹{transaction.transaction_amount.toFixed(2)}</span>
                    </div>
                    <div className="modal-info-item">
                        <span className="stat-label">Net Settled</span>
                        <span className="modal-info-value modal-amount" style={{ color: '#10b981' }}>
                            ₹{transaction.settled_amount.toFixed(2)}
                        </span>
                    </div>
                </div>

                <hr className="modal-divider" />

                {/* Waterfall Chart */}
                <div className="modal-section">
                    <h3 className="modal-section-title">Deduction Waterfall</h3>
                    <div className="waterfall-chart">
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={waterfallData} barCategoryGap="20%">
                                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                <YAxis hide />
                                <Tooltip content={<ChartTooltip />} />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {waterfallData.map((entry, i) => (
                                        <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Breakdown Details */}
                <div className="modal-section">
                    <h3 className="modal-section-title">Fee Breakdown</h3>
                    <div className="breakdown-rows">
                        <div className="breakdown-row">
                            <span>Expected Fees (MDR + GST)</span>
                            <span>- ₹{transaction.expected_deduction.toFixed(2)}</span>
                        </div>
                        <div className="breakdown-row" style={{ color: transaction.difference > 0 ? '#f59e0b' : undefined }}>
                            <span>Additional Attribution</span>
                            <span>- ₹{transaction.difference.toFixed(2)}</span>
                        </div>
                        <div className="breakdown-row breakdown-total">
                            <span>Total Actual Deduction</span>
                            <span>₹{transaction.actual_deduction.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Mini Ledger */}
                {ledgerEntries.length > 0 && (
                    <div className="modal-section">
                        <h3 className="modal-section-title">Ledger Entries</h3>
                        <div className="mini-ledger">
                            {ledgerEntries.map((entry) => {
                                const cfg = typeConfig[entry.type];
                                return (
                                    <div key={entry.id} className="mini-ledger-row">
                                        <span className="ledger-type-badge" style={{ color: cfg.color, background: cfg.bg }}>
                                            {cfg.label}
                                        </span>
                                        <span className="mini-desc">{entry.description}</span>
                                        <span style={{ color: entry.amount >= 0 ? '#10b981' : '#ef4444', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                            {entry.amount >= 0 ? '+' : ''}₹{Math.abs(entry.amount).toFixed(2)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Attribution */}
                <div className="explanation-box">
                    <p className="stat-label" style={{ color: '#818cf8', marginBottom: '0.5rem' }}>Attribution Analysis</p>
                    <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{transaction.attribution}</p>
                    <p style={{ fontSize: '0.875rem', lineHeight: '1.6', color: '#e2e8f0' }}>{transaction.explanation}</p>
                    <div style={{ marginTop: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="stat-label">Confidence:</span>
                        <span className={`badge badge-${transaction.confidence.toLowerCase() === 'high' ? 'success' : transaction.confidence.toLowerCase() === 'medium' ? 'info' : 'warning'}`}>
                            {transaction.confidence}
                        </span>
                    </div>
                </div>

                <p className="modal-footer-note">
                    * This report is based on current pricing rules and available settlement data.
                </p>
            </motion.div>
        </div>
    );
};

export default BreakdownModal;
