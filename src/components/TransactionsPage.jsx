import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    HiOutlineSearch,
    HiOutlineFilter,
    HiOutlineDownload,
    HiOutlineSortDescending,
} from 'react-icons/hi';
import { subscribeToTransactions, filterTransactions } from '../logic/firestoreService';
import BreakdownModal from './BreakdownModal';

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20, 50];

const TransactionsPage = ({ user, showToast }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [methodFilter, setMethodFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('');
    const [sortDir, setSortDir] = useState('desc');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [selectedTxn, setSelectedTxn] = useState(null);

    useEffect(() => {
        const unsubscribe = subscribeToTransactions(user.uid || user.username, (transactions) => {
            setData(transactions);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    const filteredData = useMemo(() => {
        let result = filterTransactions(data, { method: methodFilter, status: statusFilter, sortBy, sortDir });
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(
                (t) =>
                    t.transaction_id.toLowerCase().includes(q) ||
                    t.order_id.toLowerCase().includes(q) ||
                    t.payment_method.toLowerCase().includes(q)
            );
        }
        return result;
    }, [data, search, methodFilter, statusFilter, sortBy, sortDir]);

    const totalPages = Math.ceil(filteredData.length / perPage);
    const pagedData = filteredData.slice((page - 1) * perPage, page * perPage);

    const methods = useMemo(() => [...new Set(data.map((t) => t.payment_method))], [data]);

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortDir('desc');
        }
    };

    const exportCSV = () => {
        const headers = ['Transaction ID', 'Order ID', 'Method', 'Amount', 'Settled', 'Deduction', 'Attribution', 'Confidence'];
        const rows = filteredData.map((t) => [
            t.transaction_id,
            t.order_id,
            t.payment_method,
            t.transaction_amount.toFixed(2),
            t.settled_amount.toFixed(2),
            t.actual_deduction.toFixed(2),
            t.attribution,
            t.confidence,
        ]);
        const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'transactions_export.csv';
        a.click();
        URL.revokeObjectURL(url);
        showToast('success', 'Transactions exported successfully');
    };

    return (
        <div className="page-container animate-fade-in">
            {loading && (
                <div className="loading-overlay">
                    <div className="loading-spinner" />
                </div>
            )}
            <div className="page-header">
                <div>
                    <h1 className="page-title gradient-text">Transactions</h1>
                    <p className="page-subtitle">View and manage all payment transactions</p>
                </div>
                <button className="btn-primary btn-with-icon" onClick={exportCSV}>
                    <HiOutlineDownload /> Export CSV
                </button>
            </div>

            {/* Filters */}
            <div className="filters-bar glass-panel">
                <div className="search-box">
                    <HiOutlineSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search by Txn ID, Order ID, or method..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="search-input"
                    />
                </div>
                <div className="filter-group">
                    <HiOutlineFilter className="filter-icon" />
                    <select
                        value={methodFilter}
                        onChange={(e) => { setMethodFilter(e.target.value); setPage(1); }}
                        className="filter-select"
                    >
                        <option value="all">All Methods</option>
                        {methods.map((m) => (
                            <option key={m} value={m}>{m.replace('_', ' ')}</option>
                        ))}
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        className="filter-select"
                    >
                        <option value="all">All Status</option>
                        <option value="correct">Correct</option>
                        <option value="flagged">Flagged</option>
                        <option value="anomaly">Anomaly</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <motion.div
                className="card glass-panel"
                style={{ padding: 0 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Txn ID</th>
                                <th>Order ID</th>
                                <th
                                    className="sortable-th"
                                    onClick={() => handleSort('date')}
                                >
                                    Date {sortBy === 'date' && (sortDir === 'asc' ? '↑' : '↓')}
                                </th>
                                <th>Method</th>
                                <th
                                    className="sortable-th"
                                    onClick={() => handleSort('amount')}
                                >
                                    Amount {sortBy === 'amount' && (sortDir === 'asc' ? '↑' : '↓')}
                                </th>
                                <th
                                    className="sortable-th"
                                    onClick={() => handleSort('settled')}
                                >
                                    Settled {sortBy === 'settled' && (sortDir === 'asc' ? '↑' : '↓')}
                                </th>
                                <th>Diff</th>
                                <th>Attribution</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pagedData.length === 0 ? (
                                <tr>
                                    <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                                        No transactions found
                                    </td>
                                </tr>
                            ) : (
                                pagedData.map((txn) => (
                                    <tr key={txn.transaction_id}>
                                        <td style={{ fontWeight: 500 }}>{txn.transaction_id}</td>
                                        <td>{txn.order_id}</td>
                                        <td>{new Date(txn.timestamp).toLocaleDateString()}</td>
                                        <td style={{ textTransform: 'capitalize' }}>{txn.payment_method.replace('_', ' ')}</td>
                                        <td>₹{txn.transaction_amount.toFixed(2)}</td>
                                        <td style={{ color: '#10b981' }}>₹{txn.settled_amount.toFixed(2)}</td>
                                        <td style={{ color: txn.difference > 0 ? '#f59e0b' : 'inherit' }}>
                                            ₹{txn.difference.toFixed(2)}
                                        </td>
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
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {filteredData.length > 0 && (
                    <div className="pagination-bar">
                        <div className="pagination-info">
                            Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filteredData.length)} of {filteredData.length}
                        </div>
                        <div className="pagination-controls">
                            <select
                                value={perPage}
                                onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                                className="filter-select"
                            >
                                {ITEMS_PER_PAGE_OPTIONS.map((n) => (
                                    <option key={n} value={n}>{n} / page</option>
                                ))}
                            </select>
                            <button className="btn-sm btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                                ← Prev
                            </button>
                            <span className="page-indicator">
                                {page} / {totalPages}
                            </span>
                            <button className="btn-sm btn-secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                                Next →
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>

            <BreakdownModal transaction={selectedTxn} onClose={() => setSelectedTxn(null)} />
        </div>
    );
};

export default TransactionsPage;
