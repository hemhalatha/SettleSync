import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineDownload,
    HiOutlineFilter,
    HiOutlineSearch,
    HiOutlineChevronDown,
    HiOutlineChevronRight,
} from 'react-icons/hi';
import { subscribeToTransactions } from '../logic/firestoreService';
import { generateLedgerEntries, getLedgerEntriesForTransaction } from '../logic/ledger';

const typeConfig = {
    credit: { label: 'Credit', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    debit: { label: 'Debit', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    settlement: { label: 'Settlement', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    refund: { label: 'Refund', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
};

const LedgerPage = ({ user, showToast }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [expandedTxn, setExpandedTxn] = useState(null);

    useEffect(() => {
        const unsubscribe = subscribeToTransactions(user.uid || user.username, (transactions) => {
            setData(transactions);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    const allEntries = useMemo(() => generateLedgerEntries(data), [data]);

    const filteredEntries = useMemo(() => {
        let result = allEntries;
        if (typeFilter !== 'all') result = result.filter((e) => e.type === typeFilter);
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(
                (e) =>
                    e.txnId.toLowerCase().includes(q) ||
                    e.id.toLowerCase().includes(q) ||
                    e.description.toLowerCase().includes(q)
            );
        }
        return result;
    }, [allEntries, typeFilter, search]);

    // Group entries by txnId for expansion
    const txnIds = [...new Set(filteredEntries.map((e) => e.txnId))];

    const toggleExpand = (txnId) => {
        setExpandedTxn(expandedTxn === txnId ? null : txnId);
    };

    const exportCSV = () => {
        const headers = ['Entry ID', 'Txn ID', 'Type', 'Description', 'Amount', 'Running Balance', 'Timestamp'];
        const rows = filteredEntries.map((e) => [
            e.id, e.txnId, e.type, `"${e.description}"`, e.amount.toFixed(2), e.runningBalance.toFixed(2), e.timestamp,
        ]);
        const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ledger_export.csv';
        a.click();
        URL.revokeObjectURL(url);
        showToast('success', 'Ledger exported successfully');
    };

    const totalCredits = filteredEntries.filter((e) => e.type === 'credit').reduce((s, e) => s + e.amount, 0);
    const totalDebits = filteredEntries.filter((e) => e.type === 'debit').reduce((s, e) => s + Math.abs(e.amount), 0);
    const totalSettlements = filteredEntries.filter((e) => e.type === 'settlement').reduce((s, e) => s + e.amount, 0);

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title gradient-text">Accounting Ledger</h1>
                    <p className="page-subtitle">Double-entry records for all transactions</p>
                </div>
                <button className="btn-primary btn-with-icon" onClick={exportCSV}>
                    <HiOutlineDownload /> Export CSV
                </button>
            </div>

            {/* Summary Cards */}
            <div className="ledger-summary">
                <div className="ledger-summary-card" style={{ borderLeftColor: '#10b981' }}>
                    <span className="stat-label">Total Credits</span>
                    <span className="stat-value" style={{ color: '#10b981' }}>₹{totalCredits.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="ledger-summary-card" style={{ borderLeftColor: '#ef4444' }}>
                    <span className="stat-label">Total Debits</span>
                    <span className="stat-value" style={{ color: '#ef4444' }}>₹{totalDebits.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="ledger-summary-card" style={{ borderLeftColor: '#3b82f6' }}>
                    <span className="stat-label">Net Settlements</span>
                    <span className="stat-value" style={{ color: '#3b82f6' }}>₹{totalSettlements.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-bar glass-panel">
                <div className="search-box">
                    <HiOutlineSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search by Entry ID, Txn ID, or description..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="search-input"
                    />
                </div>
                <div className="filter-group">
                    <HiOutlineFilter className="filter-icon" />
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="filter-select">
                        <option value="all">All Types</option>
                        <option value="credit">Credits</option>
                        <option value="debit">Debits</option>
                        <option value="settlement">Settlements</option>
                        <option value="refund">Refunds</option>
                    </select>
                </div>
            </div>

            {/* Ledger Table */}
            <motion.div
                className="card glass-panel"
                style={{ padding: 0 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="table-container">
                    <table className="ledger-table">
                        <thead>
                            <tr>
                                <th style={{ width: 30 }}></th>
                                <th>Entry ID</th>
                                <th>Txn ID</th>
                                <th>Type</th>
                                <th>Description</th>
                                <th className="text-right">Amount</th>
                                <th className="text-right">Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEntries.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                                        No ledger entries found
                                    </td>
                                </tr>
                            ) : (
                                filteredEntries.map((entry) => {
                                    const cfg = typeConfig[entry.type];
                                    const isExpanded = expandedTxn === entry.txnId;
                                    const isFirstOfTxn = filteredEntries.findIndex((e) => e.txnId === entry.txnId) === filteredEntries.indexOf(entry);

                                    return (
                                        <React.Fragment key={entry.id}>
                                            <tr
                                                className={`ledger-row ledger-${entry.type}`}
                                                onClick={() => isFirstOfTxn && toggleExpand(entry.txnId)}
                                                style={{ cursor: isFirstOfTxn ? 'pointer' : 'default' }}
                                            >
                                                <td>
                                                    {isFirstOfTxn && (
                                                        isExpanded ? <HiOutlineChevronDown className="expand-icon" /> : <HiOutlineChevronRight className="expand-icon" />
                                                    )}
                                                </td>
                                                <td className="mono">{entry.id}</td>
                                                <td className="mono">{entry.txnId}</td>
                                                <td>
                                                    <span
                                                        className="ledger-type-badge"
                                                        style={{ color: cfg.color, background: cfg.bg }}
                                                    >
                                                        {cfg.label}
                                                    </span>
                                                </td>
                                                <td>{entry.description}</td>
                                                <td className="text-right" style={{ color: entry.amount >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                                                    {entry.amount >= 0 ? '+' : ''}₹{Math.abs(entry.amount).toFixed(2)}
                                                </td>
                                                <td className="text-right mono">₹{entry.runningBalance.toFixed(2)}</td>
                                            </tr>
                                            {/* Expanded sub-entries */}
                                            {isExpanded && isFirstOfTxn && (
                                                <tr>
                                                    <td colSpan="7" className="expanded-cell">
                                                        <AnimatePresence>
                                                            <motion.div
                                                                className="expanded-entries"
                                                                initial={{ opacity: 0, height: 0 }}
                                                                animate={{ opacity: 1, height: 'auto' }}
                                                                exit={{ opacity: 0, height: 0 }}
                                                            >
                                                                <h4>All entries for {entry.txnId}</h4>
                                                                <div className="mini-ledger">
                                                                    {getLedgerEntriesForTransaction(allEntries, entry.txnId).map((sub) => {
                                                                        const subCfg = typeConfig[sub.type];
                                                                        return (
                                                                            <div key={sub.id} className="mini-ledger-row">
                                                                                <span className="ledger-type-badge" style={{ color: subCfg.color, background: subCfg.bg }}>
                                                                                    {subCfg.label}
                                                                                </span>
                                                                                <span className="mini-desc">{sub.description}</span>
                                                                                <span style={{ color: sub.amount >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                                                                                    {sub.amount >= 0 ? '+' : ''}₹{Math.abs(sub.amount).toFixed(2)}
                                                                                </span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </motion.div>
                                                        </AnimatePresence>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            <p className="ledger-footer-note">
                {filteredEntries.length} entries shown • Double-entry accounting ensures every transaction is fully reconciled
            </p>
        </div>
    );
};

export default LedgerPage;
