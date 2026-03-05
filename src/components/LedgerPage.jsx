import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineDownload,
    HiOutlineFilter,
    HiOutlineSearch,
    HiOutlineChevronDown,
    HiOutlineChevronRight,
    HiOutlineCurrencyRupee,
    HiOutlineTrendingUp,
    HiOutlineCreditCard,
} from 'react-icons/hi';
import { subscribeToTransactions } from '../logic/firestoreService';
import { generateLedgerEntries, getLedgerEntriesForTransaction } from '../logic/ledger';
import { getCurrentUser } from '../logic/storage';

const typeConfig = {
    credit: { label: 'Credit', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    debit: { label: 'Debit', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    settlement: { label: 'Settlement', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    refund: { label: 'Refund', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
};

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="chart-tooltip glass-panel" style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--glass-border)' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Balance</p>
                <p style={{ margin: 0, fontWeight: 700, color: 'var(--primary)' }}>₹{Number(payload[0].value).toLocaleString()}</p>
            </div>
        );
    }
    return null;
};

const LedgerPage = ({ user: userProp, showToast }) => {
    const user = userProp || getCurrentUser();
    const [data, setData] = useState([]);
    const [typeFilter, setTypeFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [expandedTxn, setExpandedTxn] = useState(null);

    useEffect(() => {
        if (!user) return;
        const unsubscribe = subscribeToTransactions(user.uid || user.username, (transactions) => {
            setData(transactions);
        });
        return () => unsubscribe();
    }, [user?.uid, user?.username]); // eslint-disable-line react-hooks/exhaustive-deps

    const allEntries = useMemo(() => {
        try {
            return generateLedgerEntries(data || []) || [];
        } catch (e) {
            console.error('Ledger error:', e);
            return [];
        }
    }, [data]);

    const stats = useMemo(() => {
        try {
            if (!allEntries || allEntries.length === 0) {
                return { credits: 0, debits: 0, settlements: 0 };
            }
            // Total Money In: Credits minus Refunds (since refund is money going back out)
            const credits = allEntries.filter((e) => e.type === 'credit').reduce((s, e) => s + (Number(e.amount) || 0), 0);
            const refunds = allEntries.filter((e) => e.type === 'refund').reduce((s, e) => s + Math.abs(Number(e.amount) || 0), 0);

            // Total Fees: All debits (processing fees, GST, etc.)
            const debits = allEntries.filter((e) => e.type === 'debit').reduce((s, e) => s + Math.abs(Number(e.amount) || 0), 0);

            // Received in Bank: Net sum of all settlement payouts
            // This includes money received (positive) and money returned to customers (negative).
            const settlements = allEntries.filter((e) => e.type === 'settlement').reduce((s, e) => s + (Number(e.amount) || 0), 0);

            return {
                credits: credits - refunds,
                debits,
                settlements
            };
        } catch (e) {
            console.error('Ledger stats error:', e);
            return { credits: 0, debits: 0, settlements: 0 };
        }
    }, [allEntries]);

    const filteredEntries = useMemo(() => {
        try {
            let result = allEntries || [];
            if (typeFilter !== 'all') result = result.filter((e) => e.type === typeFilter);
            if (search) {
                const q = search.toLowerCase();
                result = result.filter(
                    (e) =>
                        (e.txnId || '').toLowerCase().includes(q) ||
                        (e.id || '').toLowerCase().includes(q) ||
                        (e.description || '').toLowerCase().includes(q)
                );
            }
            return result;
        } catch (e) {
            console.error('Ledger filter error:', e);
            return [];
        }
    }, [allEntries, typeFilter, search]);

    const primaryEntries = useMemo(() => {
        // Only show credits and refunds in the main table list
        return (filteredEntries || []).filter(e => e.type === 'credit' || e.type === 'refund');
    }, [filteredEntries]);

    const toggleExpand = (txnId) => {
        setExpandedTxn(expandedTxn === txnId ? null : txnId);
    };

    const exportCSV = () => {
        try {
            const headers = ['Record', 'Payment ID', 'Type', 'Description', 'Amount', 'Running Balance', 'Timestamp'];
            const rows = (filteredEntries || []).map((e) => [
                e.id, e.txnId, e.type, `"${e.description}"`, (e.amount || 0).toFixed(2), (e.runningBalance || 0).toFixed(2), e.timestamp,
            ]);
            const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `SettleSync_Ledger_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('success', 'Ledger exported successfully');
        } catch (e) {
            showToast('error', 'Export failed');
        }
    };

    return (
        <div className="page-container animate-fade-in">
            <header className="page-header">
                <div>
                    <h1 className="page-title gradient-text">Payment History</h1>
                    <p className="page-subtitle">Detailed log of all your payments and fees</p>
                </div>
                <button className="btn-primary btn-with-icon" onClick={exportCSV}>
                    <HiOutlineDownload strokeWidth={2} />
                    <span>Export History</span>
                </button>
            </header>

            {/* Summary Cards */}
            <div className="ledger-summary">
                <motion.div
                    className="ledger-summary-card"
                    whileHover={{ y: -5, scale: 1.02 }}
                    style={{ borderBottom: '3px solid var(--success)', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, transparent 100%)' }}
                >
                    <div className="stat-icon-row">
                        <span className="stat-label">Total Money In</span>
                        <div className="stat-icon-mini" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
                            <HiOutlineCurrencyRupee />
                        </div>
                    </div>
                    <span className="stat-value" style={{ color: 'var(--success)' }}>
                        ₹{(stats.credits || 0).toLocaleString('en-IN')}
                    </span>
                    <div className="stat-hint">Net revenue before fees</div>
                </motion.div>

                <motion.div
                    className="ledger-summary-card"
                    whileHover={{ y: -5, scale: 1.02 }}
                    style={{ borderBottom: '3px solid var(--danger)', background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.1) 0%, transparent 100%)' }}
                >
                    <div className="stat-icon-row">
                        <span className="stat-label">Total Fees</span>
                        <div className="stat-icon-mini" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
                            <HiOutlineCreditCard />
                        </div>
                    </div>
                    <span className="stat-value" style={{ color: 'var(--danger)' }}>
                        ₹{(stats.debits || 0).toLocaleString('en-IN')}
                    </span>
                    <div className="stat-hint">MDR, GST, and Payout charges</div>
                </motion.div>

                <motion.div
                    className="ledger-summary-card"
                    whileHover={{ y: -5, scale: 1.02 }}
                    style={{ borderBottom: '3px solid var(--info)', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, transparent 100%)' }}
                >
                    <div className="stat-icon-row">
                        <span className="stat-label">Received in Bank</span>
                        <div className="stat-icon-mini" style={{ background: 'rgba(99, 102, 241, 0.12)', color: 'var(--info)' }}>
                            <HiOutlineTrendingUp />
                        </div>
                    </div>
                    <span className="stat-value" style={{ color: 'var(--info)' }}>
                        ₹{(stats.settlements || 0).toLocaleString('en-IN')}
                    </span>
                    <div className="stat-hint">Net deposits to your account</div>
                </motion.div>
            </div>

            {/* Filters Bar */}
            <div className="filters-bar glass-panel" style={{ padding: '1rem 1.5rem' }}>
                <div className="search-box">
                    <HiOutlineSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search by Payment ID or description..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="search-input"
                    />
                </div>
                <div className="filter-group">
                    <HiOutlineFilter className="filter-icon" />
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="filter-select">
                        <option value="all">All Entry Types</option>
                        <option value="credit">Money In (Sales)</option>
                        <option value="debit">Money Out (Fees)</option>
                        <option value="settlement">Bank Settlements</option>
                        <option value="refund">Refunds</option>
                    </select>
                </div>
            </div>

            {/* Ledger Table Card */}
            <motion.div
                className="card glass-panel"
                style={{ padding: 0, overflow: 'hidden' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <div className="table-container">
                    <table className="ledger-table">
                        <thead>
                            <tr>
                                <th style={{ width: 48 }}></th>
                                <th>Record</th>
                                <th>Payment ID</th>
                                <th>Type</th>
                                <th>Description</th>
                                <th className="text-right">Amount</th>
                                <th className="text-right">Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {primaryEntries.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                                        No records found
                                    </td>
                                </tr>
                            ) : (
                                primaryEntries.map((entry) => {
                                    const cfg = typeConfig[entry.type];
                                    const isExpanded = expandedTxn === entry.txnId;

                                    // Get the "other" details for this transaction (fees and settlements)
                                    const details = getLedgerEntriesForTransaction(allEntries, entry.txnId)
                                        .filter(e => e.id !== entry.id);

                                    return (
                                        <React.Fragment key={entry.id}>
                                            <tr
                                                className={`ledger-row ledger-${entry.type} ${isExpanded ? 'is-expanded' : ''}`}
                                                onClick={() => details.length > 0 && toggleExpand(entry.txnId)}
                                                style={{ cursor: details.length > 0 ? 'pointer' : 'default', position: 'relative' }}
                                            >
                                                <td className="text-center timeline-cell">
                                                    <div className="timeline-line"></div>
                                                    <div className={`timeline-dot ${entry.type}`}>
                                                        {entry.type === 'credit' ? <HiOutlineCurrencyRupee /> : <HiOutlineTrendingUp />}
                                                    </div>
                                                </td>
                                                <td className="mono" style={{ fontSize: '0.75rem', opacity: 0.6 }}>{entry.id}</td>
                                                <td className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{entry.txnId}</td>
                                                <td>
                                                    <span
                                                        className={`ledger-type-badge-p type-${entry.type}`}
                                                    >
                                                        {cfg.label}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: '0.875rem', fontWeight: 500 }}>{entry.description}</td>
                                                <td className="text-right" style={{ color: (entry.amount || 0) >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700, fontSize: '0.95rem' }}>
                                                    {(entry.amount || 0) >= 0 ? '+' : ''}₹{Math.abs(entry.amount || 0).toLocaleString()}
                                                </td>
                                                <td className="text-right mono" style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                                    ₹{(entry.runningBalance || 0).toLocaleString()}
                                                </td>
                                            </tr>
                                            {/* Detailed breakdown reveal */}
                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <tr>
                                                        <td colSpan="7" className="expanded-cell" style={{ padding: '0 1rem 1rem 4rem' }}>
                                                            <motion.div
                                                                className="expanded-entries-p glass-panel"
                                                                initial={{ opacity: 0, scale: 0.98, y: -10 }}
                                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                exit={{ opacity: 0, scale: 0.98, y: -10 }}
                                                                transition={{ duration: 0.3, ease: 'easeOut' }}
                                                            >
                                                                <div className="expanded-header">
                                                                    <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                                        Breakdown for Transaction {entry.txnId}
                                                                    </h4>
                                                                </div>
                                                                <div className="mini-ledger-p">
                                                                    {details.map((sub, idx) => {
                                                                        const subCfg = typeConfig[sub.type];
                                                                        return (
                                                                            <motion.div
                                                                                key={sub.id}
                                                                                className="mini-ledger-row-p"
                                                                                initial={{ opacity: 0, x: -10 }}
                                                                                animate={{ opacity: 1, x: 0 }}
                                                                                transition={{ delay: 0.1 + idx * 0.05 }}
                                                                            >
                                                                                <div className={`entry-point ${sub.type}`} />
                                                                                <span className="sub-type" style={{ color: subCfg.color }}>
                                                                                    {subCfg.label}
                                                                                </span>
                                                                                <span className="sub-desc">{sub.description}</span>
                                                                                <div style={{ flex: 1 }} />
                                                                                <span className="sub-amount" style={{ color: sub.amount >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                                                                    {sub.amount >= 0 ? '+' : '-'}₹{Math.abs(sub.amount).toLocaleString()}
                                                                                </span>
                                                                                <span className="sub-bal">
                                                                                    ₹{sub.runningBalance.toLocaleString()}
                                                                                </span>
                                                                            </motion.div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </motion.div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </AnimatePresence>
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            <footer className="ledger-footer-note">
                <strong>{filteredEntries.length}</strong> records shown • Verified by SettleSync
            </footer>
        </div>
    );
};

export default LedgerPage;
