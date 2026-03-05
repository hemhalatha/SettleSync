import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    HiOutlineSearch,
    HiOutlineFilter,
    HiOutlineDownload,
    HiOutlineSortDescending,
} from 'react-icons/hi';
import { subscribeToTransactions, filterTransactions } from '../logic/firestoreService';
import { getCurrentUser } from '../logic/storage';
import BreakdownModal from './BreakdownModal';

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20, 50];

const TransactionsPage = ({ user: userProp, showToast }) => {
    const user = userProp || getCurrentUser();
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
        if (!user) { setLoading(false); return; }
        const unsubscribe = subscribeToTransactions(user.uid || user.username, (transactions) => {
            setData(transactions);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user?.uid, user?.username]); // eslint-disable-line react-hooks/exhaustive-deps

    const filteredData = useMemo(() => {
        try {
            let result = filterTransactions(data || [], { method: methodFilter, status: statusFilter, sortBy, sortDir });
            if (search) {
                const q = search.toLowerCase();
                result = result.filter(
                    (t) =>
                        (t.transaction_id || '').toLowerCase().includes(q) ||
                        (t.order_id || '').toLowerCase().includes(q) ||
                        (t.payment_method || '').toLowerCase().includes(q)
                );
            }
            return result || [];
        } catch (e) {
            console.error('Error filtering transactions:', e);
            return [];
        }
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
        const headers = ['Payment ID', 'Order ID', 'Method', 'Sale Amount', 'Received', 'Fees', 'Status', 'Confidence'];
        const rows = (filteredData || []).map((t) => [
            t.transaction_id || 'N/A',
            t.order_id || 'N/A',
            t.payment_method || 'unknown',
            (Number(t.transaction_amount) || 0).toFixed(2),
            (Number(t.settled_amount) || 0).toFixed(2),
            (Number(t.actual_deduction) || 0).toFixed(2),
            t.attribution || 'Pending',
            t.confidence || 'Standard',
        ]);
        const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SettleSync_Export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('success', 'Full data exported to CSV');
    };

    return (
        <div className="page-container animate-fade-in">
            {loading && (
                <div className="loading-overlay">
                    <div className="loading-spinner" />
                </div>
            )}

            <header className="page-header">
                <div>
                    <h1 className="page-title gradient-text">All Payments</h1>
                    <p className="page-subtitle">Complete list of every payment received</p>
                </div>
                <button className="btn-primary btn-with-icon" onClick={exportCSV}>
                    <HiOutlineDownload strokeWidth={2} />
                    <span>Export Data</span>
                </button>
            </header>

            {/* Filters Bar */}
            <div className="filters-bar glass-panel" style={{ padding: '1rem 1.5rem' }}>
                <div className="search-box">
                    <HiOutlineSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search by ID, Order, or Method..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="search-input"
                    />
                </div>
                <div className="filter-group">
                    <div className="filter-item">
                        <HiOutlineFilter className="filter-icon" />
                        <select
                            value={methodFilter}
                            onChange={(e) => { setMethodFilter(e.target.value); setPage(1); }}
                            className="filter-select"
                        >
                            <option value="all">All Payment Methods</option>
                            {(methods || []).map((m) => (
                                <option key={m} value={m}>{(m || 'unknown').replace('_', ' ').toUpperCase()}</option>
                            ))}
                        </select>
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        className="filter-select"
                    >
                        <option value="all">All Statuses</option>
                        <option value="correct">Verified</option>
                        <option value="flagged">Flagged</option>
                        <option value="anomaly">Needs Review</option>
                    </select>
                </div>
            </div>

            {/* Transactions Card */}
            <motion.div
                className="card glass-panel"
                style={{ padding: 0, overflow: 'hidden' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Payment ID</th>
                                <th>Order ID</th>
                                <th className="sortable-th" onClick={() => handleSort('date')}>
                                    Date {sortBy === 'date' && (sortDir === 'asc' ? '↑' : '↓')}
                                </th>
                                <th>Method</th>
                                <th className="sortable-th text-right" onClick={() => handleSort('amount')}>
                                    Sale Amount {sortBy === 'amount' && (sortDir === 'asc' ? '↑' : '↓')}
                                </th>
                                <th className="sortable-th text-right" onClick={() => handleSort('settled')}>
                                    Received {sortBy === 'settled' && (sortDir === 'asc' ? '↑' : '↓')}
                                </th>
                                <th className="text-right">Fees</th>
                                <th>Status</th>
                                <th className="text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pagedData.length === 0 ? (
                                <tr>
                                    <td colSpan="9" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                                        <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No payments found</div>
                                        <div style={{ fontSize: '0.9rem', opacity: 0.6 }}>Try adjusting your filters or search</div>
                                    </td>
                                </tr>
                            ) : (
                                pagedData.map((txn) => (
                                    <tr key={txn.transaction_id || Math.random()}>
                                        <td className="mono" style={{ color: 'var(--text-secondary)' }}>{txn.transaction_id || 'N/A'}</td>
                                        <td>{txn.order_id || 'N/A'}</td>
                                        <td>{txn.timestamp ? new Date(txn.timestamp).toLocaleDateString() : 'N/A'}</td>
                                        <td style={{ fontWeight: 500, textTransform: 'uppercase', fontSize: '0.75rem' }}>
                                            {(txn.payment_method || 'unknown').replace('_', ' ')}
                                        </td>
                                        <td className="text-right" style={{ fontWeight: 600 }}>₹{(Number(txn.transaction_amount) || 0).toLocaleString()}</td>
                                        <td className="text-right" style={{ color: 'var(--success)', fontWeight: 600 }}>₹{(Number(txn.settled_amount) || 0).toLocaleString()}</td>
                                        <td className="text-right" style={{
                                            color: (Number(txn.difference) || 0) > 0 ? 'var(--warning)' : 'var(--text-secondary)',
                                            fontWeight: (Number(txn.difference) || 0) > 0 ? 600 : 400
                                        }}>
                                            ₹{(Number(txn.difference) || 0).toLocaleString()}
                                        </td>
                                        <td>
                                            <span className={`badge-premium ${(txn.attribution || '').includes('Correct') ? 'badge-success-p' :
                                                (txn.attribution || '').includes('Anomaly') ? 'badge-danger-p' :
                                                    'badge-info-p'
                                                }`}>
                                                {(txn.attribution || 'Processing').replace('Correct Settlement', 'Verified').replace('Unexplained Anomaly', 'Needs Review').replace('Service Surcharge', 'Extra Fee')}
                                            </span>
                                        </td>
                                        <td className="text-right">
                                            <button className="btn-secondary btn-sm" onClick={() => setSelectedTxn(txn)}>
                                                Review
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Modern Pagination */}
                {filteredData.length > 0 && (
                    <footer className="pagination-bar">
                        <div className="pagination-info">
                            Showing <strong>{(page - 1) * perPage + 1}</strong> – <strong>{Math.min(page * perPage, filteredData.length)}</strong> of <strong>{filteredData.length}</strong> payments
                        </div>
                        <div className="pagination-controls">
                            <div className="per-page-select">
                                <select
                                    value={perPage}
                                    onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                                    className="filter-select"
                                    style={{ padding: '0.35rem 0.5rem' }}
                                >
                                    {ITEMS_PER_PAGE_OPTIONS.map((n) => (
                                        <option key={n} value={n}>{n} per page</option>
                                    ))}
                                </select>
                            </div>
                            <div className="spacer" style={{ width: '1rem' }} />
                            <button className="btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                                Previous
                            </button>
                            <span className="page-indicator">
                                Page <strong>{page}</strong> of {totalPages}
                            </span>
                            <button className="btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                                Next
                            </button>
                        </div>
                    </footer>
                )}
            </motion.div>

            <BreakdownModal transaction={selectedTxn} onClose={() => setSelectedTxn(null)} />
        </div>
    );
};

export default TransactionsPage;
